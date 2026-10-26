// Glitter Belles – tiny backend. Data lives in data.json (no database needed).
const express = require('express'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const app = express(), FILE = path.join(__dirname, 'data.json');
const cors = require ('cors'); 
app.use(cors());
const PASS = process.env.ADMIN_PASSWORD || 'glitter123'; // CHANGE THIS before going live
const seed = {
  services: [
    { id: 's1', name: 'Soft Gel Full Set', category: 'Soft gel', price: 1500, duration: 90, description: 'Lightweight, long-lasting and natural in finish.', active: true },
    { id: 's2', name: 'Gel Extensions', category: 'Extensions', price: 2200, duration: 120, description: 'Sculpted length in your shape: almond, coffin or square.', active: true },
    { id: 's3', name: 'Custom Nail Art (per hand)', category: 'Nail art', price: 800, duration: 60, description: 'Chrome, gold foil, florals or your own reference.', active: true },
    { id: 's4', name: 'Press-on Set (custom made)', category: 'Press-ons', price: 1800, duration: 0, description: 'Reusable set made to your sizes, delivered in a keepsake box.', active: true }
  ],
  offers: [{ id: 'o1', title: 'Festive season', text: 'Free gold foil accent on every full set this month', active: true }],
  bookings: []
};
let db = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE)) : seed;
const save = () => fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
const tokens = new Set(), id = () => crypto.randomUUID().slice(0, 8);
const auth = (q, s, n) => tokens.has(q.get('x-token')) ? n() : s.status(401).json({ error: 'Please log in again.' });

app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules/three')));
app.use('/vendor/gsap', express.static(path.join(__dirname, 'node_modules/gsap')));
app.use(express.json()); app.use(express.static(path.join(__dirname, 'public')));

// ---- public ----
app.get('/api/services', (q, s) => s.json(db.services.filter(x => x.active)));
app.get('/api/offers', (q, s) => s.json(db.offers.filter(x => x.active)));
app.get('/api/slots', (q, s) => s.json(db.bookings.filter(b => b.date === q.query.date && b.status !== 'cancelled').map(b => b.time)));
app.post('/api/bookings', (q, s) => {
  const { name, phone, date, time, services, notes } = q.body;
  if (!name || !phone || !date || !time) return s.status(400).json({ error: 'Please fill name, phone, date and time.' });
  if (db.bookings.some(b => b.date === date && b.time === time && b.status !== 'cancelled')) return s.status(409).json({ error: 'That slot was just taken. Pick another.' });
  db.bookings.push({ id: id(), name, phone, date, time, services: services || [], notes: notes || '', status: 'new', created: new Date().toISOString() });
  save(); s.json({ ok: true });
});

// ---- admin ----
app.post('/api/login', (q, s) => {
  if (q.body.password !== PASS) return s.status(401).json({ error: 'Wrong password.' });
  const t = crypto.randomBytes(16).toString('hex'); tokens.add(t); s.json({ token: t });
});
const ok = c => ['services', 'offers', 'bookings'].includes(c);
app.get('/api/admin/:c', auth, (q, s) => ok(q.params.c) ? s.json(db[q.params.c]) : s.sendStatus(404));
app.post('/api/admin/:c', auth, (q, s) => { if (!ok(q.params.c)) return s.sendStatus(404); const r = { ...q.body, id: id() }; db[q.params.c].push(r); save(); s.json(r); });
app.put('/api/admin/:c/:id', auth, (q, s) => {
  if (!ok(q.params.c)) return s.sendStatus(404);
  const i = db[q.params.c].findIndex(x => x.id === q.params.id); if (i < 0) return s.sendStatus(404);
  db[q.params.c][i] = { ...db[q.params.c][i], ...q.body, id: q.params.id }; save(); s.json(db[q.params.c][i]);
});
app.delete('/api/admin/:c/:id', auth, (q, s) => { if (!ok(q.params.c)) return s.sendStatus(404); db[q.params.c] = db[q.params.c].filter(x => x.id !== q.params.id); save(); s.json({ ok: true }); });

app.listen(process.env.PORT || 3000, () => console.log('Glitter Belles running → http://localhost:3000  |  admin → /admin.html'));
