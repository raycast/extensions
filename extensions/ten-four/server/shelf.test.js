const { test, before, after } = require("node:test");
const assert = require("node:assert");
const os = require("os");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

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
    Array.from({ length: 20 }, (_, i) =>
      post({ label: `c${i}`, text: `c${i}` }),
    ),
  );
  const items = await (await fetch(`${base}/shelf`)).json();
  assert.equal(items.length, 20);
  assert.equal(new Set(items.map((i) => i.label)).size, 20);
});

test("a save leaves no temp or lock file behind", async () => {
  await post({ text: "tidy" });
  const stray = fs
    .readdirSync(TMP)
    .filter((f) => f.endsWith(".tmp") || f.endsWith(".lock"));
  assert.deepEqual(stray, []);
});

test("first mutation creates a missing store directory", async () => {
  const store = path.join(TMP, "not-created", "yet", "shelf.json");
  const shelfPath = require.resolve("./shelf.js");
  const child = spawn(
    process.execPath,
    [
      "-e",
      `
      const { modify } = require(${JSON.stringify(shelfPath)});
      modify(() => [{ id: "first" }]).then(
        () => process.exit(0),
        (err) => {
          console.error(err);
          process.exit(1);
        }
      );
      `,
    ],
    {
      env: { ...process.env, TENFOUR_FILE: store },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let err = "";
  child.stderr.on("data", (d) => {
    err += d;
  });
  await new Promise((resolve, reject) => {
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(err || `exit ${code}`)),
    );
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(store, "utf8")), [{ id: "first" }]);
});

function fileWriter(id, holdMs) {
  const shelfPath = require.resolve("./shelf.js");
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "-e",
        `
        const { modify } = require(${JSON.stringify(shelfPath)});
        modify((items) => {
          const end = Date.now() + ${Number(holdMs)};
          while (Date.now() < end) {}
          items.push({
            id: ${JSON.stringify(id)},
            label: ${JSON.stringify(id)},
            text: ${JSON.stringify(id)},
            ts: Date.now(),
            pinned: false,
          });
          return items;
        }).then(
          () => process.exit(0),
          (err) => {
            console.error(err);
            process.exit(1);
          }
        );
        `,
      ],
      { env: process.env, stdio: ["ignore", "ignore", "pipe"] },
    );
    let err = "";
    child.stderr.on("data", (d) => {
      err += d;
    });
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(err || `exit ${code}`)),
    );
  });
}

test("overlapping process writes keep both items", async () => {
  await fetch(`${base}/shelf`, { method: "DELETE" });
  await Promise.all([fileWriter("w1", 120), fileWriter("w2", 120)]);
  const items = await (await fetch(`${base}/shelf`)).json();
  const ids = new Set(items.map((i) => i.id));
  assert.ok(ids.has("w1"), "missing w1");
  assert.ok(ids.has("w2"), "missing w2");
});

test("a live long-running writer is not treated as stale", async () => {
  await fetch(`${base}/shelf`, { method: "DELETE" });
  const first = fileWriter("slow", 2300);
  const lock = `${process.env.TENFOUR_FILE}.lock`;
  const start = Date.now();
  while (!fs.existsSync(lock)) {
    if (Date.now() - start > 2000) throw new Error("first writer never locked");
    await new Promise((r) => setTimeout(r, 5));
  }
  await fileWriter("after-slow", 0);
  await first;
  const items = await (await fetch(`${base}/shelf`)).json();
  const ids = new Set(items.map((item) => item.id));
  assert.ok(ids.has("slow"), "missing slow writer");
  assert.ok(ids.has("after-slow"), "missing waiting writer");
});

test("an old lock from a reused PID is reclaimed", async () => {
  const store = path.join(TMP, "reused-pid.json");
  const lock = `${store}.lock`;
  fs.writeFileSync(store, "[]");
  // The test process is alive, but did not create this old lock. This models a
  // crashed writer whose PID has been assigned to an unrelated process.
  fs.writeFileSync(
    lock,
    JSON.stringify({
      pid: process.pid,
      fingerprint: true,
      startedAt: "a different process start time",
      token: "reused",
    }),
  );
  fs.utimesSync(lock, new Date(0), new Date(Date.now() - 3000));

  const shelfPath = require.resolve("./shelf.js");
  const child = spawn(
    process.execPath,
    [
      "-e",
      `
      const { modify } = require(${JSON.stringify(shelfPath)});
      modify(() => [{ id: "reclaimed" }]).then(
        () => process.exit(0),
        (err) => {
          console.error(err);
          process.exit(1);
        }
      );
      `,
    ],
    {
      env: { ...process.env, TENFOUR_FILE: store },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );

  const exitCode = await Promise.race([
    new Promise((resolve) => child.on("close", resolve)),
    new Promise((resolve) => setTimeout(() => resolve("timeout"), 500)),
  ]);
  if (exitCode === "timeout") child.kill();
  assert.equal(exitCode, 0, "writer remained blocked by a reused PID");
  assert.deepEqual(JSON.parse(fs.readFileSync(store, "utf8")), [
    { id: "reclaimed" },
  ]);
});

test("a local-file writer overlapping a POST keeps both items", async () => {
  await fetch(`${base}/shelf`, { method: "DELETE" });
  const child = fileWriter("cli", 150);
  const lock = `${process.env.TENFOUR_FILE}.lock`;
  const start = Date.now();
  while (!fs.existsSync(lock)) {
    if (Date.now() - start > 2000) throw new Error("child never locked");
    await new Promise((r) => setTimeout(r, 5));
  }
  const res = await post({ text: "from-http" });
  assert.equal(res.status, 201);
  await child;
  const items = await (await fetch(`${base}/shelf`)).json();
  assert.ok(items.some((i) => i.id === "cli"));
  assert.ok(items.some((i) => i.text === "from-http"));
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
