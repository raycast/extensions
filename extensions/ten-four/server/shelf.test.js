const { test, before, after } = require("node:test");
const assert = require("node:assert");
const os = require("os");
const fs = require("fs");
const path = require("path");

// Point the store at a temp file BEFORE requiring the server (STORE is read at load).
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "tenfour-"));
process.env.TENFOUR_FILE = path.join(TMP, "shelf.json");

const { createServer, truncate, hostIsAllowed } = require("./shelf.js");

let server;
let base;

before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const post = (body) =>
  fetch(`${base}/shelf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("GET /shelf is empty initially", async () => {
  const res = await fetch(`${base}/shelf`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), []);
});

test("POST /shelf adds an item and derives the label", async () => {
  const res = await post({ text: "hello world\nsecond line" });
  assert.equal(res.status, 201);
  const item = await res.json();
  assert.equal(item.text, "hello world\nsecond line");
  assert.equal(item.label, "hello world");
  assert.equal(item.pinned, false);
  assert.ok(item.id);
  assert.ok(typeof item.ts === "number");
});

test("POST honors an explicit label", async () => {
  const item = await (await post({ label: "My Label", text: "x" })).json();
  assert.equal(item.label, "My Label");
});

test("POST with blank text is 400", async () => {
  const res = await post({ text: "   " });
  assert.equal(res.status, 400);
});

test("PATCH pins an item", async () => {
  const id = (await (await fetch(`${base}/shelf`)).json())[0].id;
  const res = await fetch(`${base}/shelf/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinned: true }),
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).pinned, true);
});

test("PATCH on unknown id is 404", async () => {
  const res = await fetch(`${base}/shelf/nope`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pinned: true }),
  });
  assert.equal(res.status, 404);
});

test("DELETE /shelf/:id removes one", async () => {
  const id = (await (await fetch(`${base}/shelf`)).json())[0].id;
  const res = await fetch(`${base}/shelf/${id}`, { method: "DELETE" });
  assert.equal(res.status, 200);
  const after = await (await fetch(`${base}/shelf`)).json();
  assert.ok(!after.some((i) => i.id === id));
});

test("DELETE /shelf clears all", async () => {
  await post({ text: "a" });
  const res = await fetch(`${base}/shelf`, { method: "DELETE" });
  assert.equal(res.status, 200);
  assert.deepEqual(await (await fetch(`${base}/shelf`)).json(), []);
});

test("truncate keeps all pinned plus MAX_ITEMS unpinned", () => {
  const items = [];
  for (let i = 0; i < 250; i++)
    items.push({ id: String(i), pinned: false, ts: i, text: "x", label: "x" });
  items.push({ id: "pin", pinned: true, ts: 0, text: "p", label: "p" });
  const out = truncate(items);
  assert.equal(out.filter((i) => i.pinned).length, 1);
  assert.equal(out.filter((i) => !i.pinned).length, 200);
});

test("concurrent adds all survive", async () => {
  await fetch(`${base}/shelf`, { method: "DELETE" });
  // Fire the writes together: each handler must load and save without another
  // handler slipping in between, or one of these snippets goes missing.
  await Promise.all(
    Array.from({ length: 20 }, (_, i) => post({ label: `c${i}`, text: `c${i}` })),
  );
  const items = await (await fetch(`${base}/shelf`)).json();
  assert.equal(items.length, 20);
  assert.equal(new Set(items.map((i) => i.label)).size, 20);
});

test("a save leaves no temp file behind", async () => {
  await post({ text: "tidy" });
  const stray = fs
    .readdirSync(TMP)
    .filter((f) => f.endsWith(".tmp"));
  assert.deepEqual(stray, []);
});

test("hostIsAllowed only permits loopback unless overridden", () => {
  assert.equal(hostIsAllowed("127.0.0.1", undefined), true);
  assert.equal(hostIsAllowed("::1", undefined), true);
  assert.equal(hostIsAllowed("localhost", undefined), true);
  assert.equal(hostIsAllowed("0.0.0.0", undefined), false);
  assert.equal(hostIsAllowed("192.168.1.10", undefined), false);
  // Explicit opt-in for an already-trusted network.
  assert.equal(hostIsAllowed("0.0.0.0", "1"), true);
});
