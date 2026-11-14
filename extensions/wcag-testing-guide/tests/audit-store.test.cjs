const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadModule } = require("../scripts/load-typescript.cjs");
const { AuditStore } = loadModule("src/audit-store.ts");
const { projectStorageKey, AUDIT_PROJECTS_KEY, AUDIT_ACTIVE_PROJECT_KEY } = loadModule("src/audit-projects.ts");
const valid = { "2.1": new Set(["1.1.1", "1.2.1"]), "2.2": new Set(["1.1.1", "1.2.1"]) };
const existing = { "1.2.1": { status: "fail", notes: "Keep evidence", updatedAt: "" } };
function deferred() { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; }
function fixture() {
  const data = new Map([[projectStorageKey("default", "2.2"), JSON.stringify(existing)]]);
  const storage = {
    getItem: async (key) => data.get(key),
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
  return { data, storage, store: new AuditStore(storage, valid) };
}

test("save and clear are rejected before initial loading finishes without touching stored results", async () => {
  const { data, storage, store } = fixture();
  const gate = deferred(); const get = storage.getItem;
  storage.getItem = async (key) => { await gate.promise; return get(key); };
  const loading = store.initialize();
  assert.throws(() => store.save("default", "2.2", "1.1.1", "pass", ""), /load/);
  assert.throws(() => store.clear("default", "2.2"), /load/);
  assert.deepEqual(JSON.parse(data.get(projectStorageKey("default", "2.2"))), existing);
  gate.resolve(); await loading;
  assert.deepEqual(store.getSnapshot().audits["2.2"], existing);
});

test("failed and corrupt reads keep writes blocked; retry restores existing data", async () => {
  for (const corrupt of [false, true]) {
    const { data, storage, store } = fixture(); const get = storage.getItem;
    if (corrupt) data.set(AUDIT_PROJECTS_KEY, "broken JSON");
    else storage.getItem = async () => { throw new Error("Read failed"); };
    await assert.rejects(store.initialize());
    assert.equal(store.getSnapshot().ready, false);
    assert.throws(() => store.save("default", "2.2", "1.1.1", "pass", ""));
    storage.getItem = get; data.delete(AUDIT_PROJECTS_KEY);
    await store.initialize(); assert.deepEqual(store.getSnapshot().audits["2.2"], existing);
  }
});

test("failed Save and Clear leave displayed and persisted results unchanged", async () => {
  const { data, storage, store } = fixture(); await store.initialize();
  const before = store.getSnapshot().audits;
  storage.setItem = storage.removeItem = async () => { throw new Error("Disk full"); };
  await assert.rejects(store.save("default", "2.2", "1.1.1", "pass", ""));
  await assert.rejects(store.clear("default", "2.2"));
  assert.equal(store.getSnapshot().audits, before);
  assert.deepEqual(JSON.parse(data.get(projectStorageKey("default", "2.2"))), existing);
});

test("queued saves merge committed results, and successful clear preserves the other edition", async () => {
  const { data, store } = fixture(); await store.initialize();
  await Promise.all([store.save("default", "2.2", "1.1.1", "pass", "First"), store.save("default", "2.2", "1.2.1", "not-applicable", "")]);
  assert.equal(Object.keys(JSON.parse(data.get(projectStorageKey("default", "2.2")))).length, 2);
  await store.save("default", "2.1", "1.1.1", "fail", "Other edition");
  await store.clear("default", "2.2");
  assert.deepEqual(store.getSnapshot().audits["2.2"], {});
  assert.equal(store.getSnapshot().audits["2.1"]["1.1.1"].notes, "Other edition");
});

test("two queued audit creations retain both projects and their isolated results", async () => {
  const { data, store } = fixture(); await store.initialize();
  await Promise.all([store.create("First"), store.create("Second")]);
  assert.deepEqual(store.getSnapshot().projects.map((p) => p.name), ["My First Audit", "First", "Second"]);
  assert.equal(JSON.parse(data.get(AUDIT_PROJECTS_KEY)).length, 3);
  assert.equal(store.getSnapshot().activeProject.name, "Second");
  const first = store.getSnapshot().projects[1]; await store.switchProject(first.id);
  await store.save(first.id, "2.2", "1.1.1", "pass", "First only");
  await store.switchProject("default"); assert.deepEqual(store.getSnapshot().audits["2.2"], existing);
});

test("switch waits for an accepted write, blocks early saves, and rejects stale editors", async () => {
  const { storage, store } = fixture(); await store.initialize(); await store.create("Next");
  const nextId = store.getSnapshot().activeProject.id;
  await store.switchProject("default");
  const gate = deferred(); const set = storage.setItem;
  storage.setItem = async (key, value) => { if (key === projectStorageKey("default", "2.2")) await gate.promise; await set(key, value); };
  const save = store.save("default", "2.2", "1.1.1", "pass", "Before switch");
  const switching = store.switchProject(nextId);
  assert.throws(() => store.save("default", "2.2", "1.2.1", "pass", "During switch"), /load/);
  gate.resolve(); await Promise.all([save, switching]);
  await assert.rejects(store.save("default", "2.2", "1.1.1", "pass", "Old editor"), /changed/);
  await store.switchProject("default"); assert.equal(store.getSnapshot().audits["2.2"]["1.1.1"].notes, "Before switch");
});

test("rapid switches finish in order; a failed switch keeps previous data and active key", async () => {
  const { data, storage, store } = fixture(); await store.initialize(); await store.create("One"); await store.create("Two");
  const [first, second] = store.getSnapshot().projects.slice(1);
  await Promise.all([store.switchProject(first.id), store.switchProject(second.id), store.switchProject("default")]);
  assert.equal(store.getSnapshot().activeProject.id, "default");
  const get = storage.getItem;
  storage.getItem = async (key) => { if (key.includes(first.id)) throw new Error("Read failed"); return get(key); };
  await assert.rejects(store.switchProject(first.id));
  assert.equal(data.get(AUDIT_ACTIVE_PROJECT_KEY), "default");
  assert.deepEqual(store.getSnapshot().audits["2.2"], existing);
  storage.getItem = get; const set = storage.setItem;
  storage.setItem = async (key, value) => { if (key === AUDIT_ACTIVE_PROJECT_KEY) throw new Error("Write failed"); return set(key, value); };
  await assert.rejects(store.switchProject(first.id));
  assert.equal(store.getSnapshot().activeProject.id, "default");
});

test("failed project list writes cannot create or erase selectable audits", async () => {
  const { data, storage, store } = fixture(); await store.initialize(); await store.create("Keep");
  const project = store.getSnapshot().activeProject;
  await store.save(project.id, "2.2", "1.1.1", "fail", "Preserve");
  const set = storage.setItem;
  storage.setItem = async (key, value) => { if (key === AUDIT_PROJECTS_KEY) throw new Error("Write failed"); return set(key, value); };
  await assert.rejects(store.create("Unsaved")); await assert.rejects(store.delete(project.id));
  assert.equal(store.getSnapshot().projects.length, 2);
  assert.equal(JSON.parse(data.get(projectStorageKey(project.id, "2.2")))["1.1.1"].notes, "Preserve");
  storage.setItem = set; await store.delete(project.id);
  assert.equal(store.getSnapshot().projects.length, 1);
  assert.equal(data.has(projectStorageKey(project.id, "2.2")), false);
});

test("interrupted deletion keeps a cleanup journal and finishes on reopening", async () => {
  const { data, storage, store } = fixture(); await store.initialize(); await store.create("Delete me");
  const id = store.getSnapshot().activeProject.id;
  await store.save(id, "2.2", "1.1.1", "fail", "Remove this");
  const remove = storage.removeItem;
  storage.removeItem = async (key) => { if (key === projectStorageKey(id, "2.2")) throw new Error("Disk error"); return remove(key); };
  await assert.rejects(store.delete(id), /cleanup failed/);
  assert.equal(store.getSnapshot().projects.some((project) => project.id === id), false);
  assert.equal(store.getSnapshot().activeProject.id, "default");
  assert.equal(data.has(projectStorageKey(id, "2.2")), true);
  storage.removeItem = remove;
  const reopened = new AuditStore(storage, valid); await reopened.initialize();
  assert.equal(data.has(projectStorageKey(id, "2.2")), false);
  assert.deepEqual(reopened.getSnapshot().audits["2.2"], existing);
});

test("a rejected result write does not poison the next queued save", async () => {
  const { storage, store } = fixture(); await store.initialize();
  const set = storage.setItem; let first = true;
  storage.setItem = async (key, value) => { if (first) { first = false; throw new Error("Write failed"); } return set(key, value); };
  const failure = store.save("default", "2.2", "1.1.1", "pass", "Failed");
  const success = store.save("default", "2.2", "1.2.1", "not-applicable", "Saved");
  await assert.rejects(failure); await success;
  assert.equal(store.getSnapshot().audits["2.2"]["1.1.1"], undefined);
  assert.equal(store.getSnapshot().audits["2.2"]["1.2.1"].notes, "Saved");
});
