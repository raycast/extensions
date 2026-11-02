const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createLoader, createMemoryStorage } = require("./helpers.cjs");

const prefix = "progress:v2:";
const values = (title = "Project", overrides = {}) => ({
  title,
  menubarTitle: title,
  startDate: new Date(2026, 0, 1),
  endDate: new Date(2027, 0, 1),
  showInMenubar: false,
  showAsCommand: false,
  ...overrides,
});
function client(storage) {
  return createLoader({
    api: { LocalStorage: storage.api, getPreferenceValues: () => ({ weekStartsOn: "1" }) },
  })("utils/progress-store.ts");
}
function legacy(overrides = {}) {
  return JSON.stringify({
    allProgress: [
      { title: "Year In Progress", type: "default", pinned: false, menubar: { shown: false } },
      {
        title: "Project",
        type: "user",
        startDate: new Date(2026, 0, 1).getTime(),
        endDate: new Date(2027, 0, 1).getTime(),
        pinned: true,
        menubar: { title: "P", shown: true },
        showAsCommand: true,
      },
    ],
    currMenubarProgressTitle: "Project",
    ...overrides,
  });
}

test("independent command snapshots cannot lose a creation when menu selection or pin changes", async () => {
  const storage = createMemoryStorage();
  const a = client(storage);
  const b = client(storage);
  await b.readProgress();
  await a.saveCustomProgress("custom:a", values());
  await b.selectMenuBar("default:quarter");
  await b.setPinned("default:month", true);
  const state = await a.readProgress();
  assert.equal(state.allProgress.find((item) => item.id === "custom:a").title, "Project");
  assert.equal(state.currMenubarProgressId, "default:quarter");
  assert.equal(state.allProgress.find((item) => item.id === "default:month").pinned, true);
  assert.equal(
    storage.writes.some((write) => write.key === "xProgress"),
    false
  );
});

test("simultaneous different-ID creations and pins survive without a shared index", async () => {
  const storage = createMemoryStorage();
  const a = client(storage);
  const b = client(storage);
  await Promise.all([a.saveCustomProgress("custom:a", values("A")), b.saveCustomProgress("custom:b", values("B"))]);
  await Promise.all([a.setPinned("custom:a", true), b.setPinned("custom:b", true)]);
  const custom = (await a.readProgress()).allProgress.filter((item) => item.type === "user");
  assert.equal(custom.length, 2);
  assert.ok(custom.every((item) => item.pinned));
});

test("legacy values migrate logically without writes and preserve dates, flags, and selections", async () => {
  const original = legacy();
  const storage = createMemoryStorage({ xProgress: original });
  const store = client(storage);
  const state = await store.readProgress();
  const item = state.allProgress.find((item) => item.id === "custom:legacy:1");
  assert.equal(item.startDate, new Date(2026, 0, 1).getTime());
  assert.equal(item.endDate, new Date(2027, 0, 1).getTime());
  assert.equal(item.pinned, true);
  assert.equal(item.menubar.title, "P");
  assert.equal(state.commandProgressId, item.id);
  assert.equal(state.currMenubarProgressId, item.id);
  assert.equal(state.allProgress[0].pinned, false);
  assert.equal(storage.writes.length, 0);
  await store.setPinned(item.id, false);
  assert.equal(storage.values.xProgress, original);
});

test("record recovery preserves original positions, missing menubar/type, and invalid source bytes", async () => {
  const original = legacy({
    allProgress: [
      null,
      { title: "Broken", type: "user", startDate: 3, endDate: 2 },
      { title: "Recoverable", startDate: 0, endDate: 1000, pinned: true, showAsCommand: true },
    ],
    currMenubarProgressTitle: "Recoverable",
  });
  const storage = createMemoryStorage({ xProgress: original });
  const state = await client(storage).readProgress();
  const custom = state.allProgress.filter((item) => item.type === "user");
  assert.equal(custom.length, 1);
  assert.equal(custom[0].id, "custom:legacy:2");
  assert.equal(custom[0].menubar.title, "Recoverable");
  assert.equal(custom[0].pinned, true);
  assert.equal(state.commandProgressId, custom[0].id);
  assert.ok(state.storageWarnings.length);
  assert.equal(storage.values.xProgress, original);
  assert.equal(storage.writes.length, 0);
});

test("invalid legacy JSON and invalid v2 records remain untouched and warn", async () => {
  const storage = createMemoryStorage({ xProgress: "{broken", [`${prefix}custom:custom:broken`]: "{bad" });
  const state = await client(storage).readProgress();
  assert.equal(state.allProgress.length, 5);
  assert.equal(state.commandProgressId, "default:year");
  assert.equal(state.storageWarnings.length, 2);
  assert.equal(storage.values.xProgress, "{broken");
  assert.equal(storage.writes.length, 0);
});

test("present invalid selection does not restore an inherited custom selection", async () => {
  const storage = createMemoryStorage({ xProgress: legacy(), [`${prefix}commandSelection`]: "custom:missing" });
  const state = await client(storage).readProgress();
  assert.equal(state.commandProgressId, "default:year");
  assert.equal(state.allProgress.filter((item) => item.showAsCommand).length, 1);
});

test("adding a visible item after hiding every item restores the menu fallback", async () => {
  const storage = createMemoryStorage();
  const store = client(storage);
  for (const item of (await store.readProgress()).allProgress) await store.setMenuBarVisible(item.id, false);
  assert.equal((await store.readProgress()).currMenubarProgressId, null);
  await store.saveCustomProgress("custom:a", values("A", { showInMenubar: true }));
  assert.equal((await store.readProgress()).currMenubarProgressId, "custom:a");
});

test("deselect and delete derive exactly one command choice; defaults cannot be deleted", async () => {
  const storage = createMemoryStorage();
  const store = client(storage);
  await store.saveCustomProgress("custom:a", values("A", { showAsCommand: true, showInMenubar: true }));
  await store.selectMenuBar("custom:a");
  assert.equal((await store.readProgress()).commandProgressId, "custom:a");
  const original = (await store.readProgress()).allProgress.find((item) => item.id === "custom:a");
  await store.saveCustomProgress("custom:a", values("A", { showAsCommand: false }), original);
  assert.equal((await store.readProgress()).commandProgressId, "default:year");
  await store.selectCommand("custom:a");
  await store.deleteCustomProgress("custom:a");
  const state = await store.readProgress();
  assert.equal(state.commandProgressId, "default:year");
  assert.equal(
    state.allProgress.some((item) => item.id === "custom:a"),
    false
  );
  await assert.rejects(store.deleteCustomProgress("default:year"));
});

test("permanent deletion wins over a late stale definition write", async () => {
  const storage = createMemoryStorage({ xProgress: legacy() });
  const store = client(storage);
  const id = "custom:legacy:1";
  await store.deleteCustomProgress(id);
  // A command which read before deletion can still finish its independent payload write.
  storage.values[`${prefix}custom:${id}`] = JSON.stringify({
    title: "Stale",
    menubarTitle: "S",
    startDate: 0,
    endDate: 1000,
    initialMenuBarVisible: true,
  });
  assert.equal(
    (await store.readProgress()).allProgress.some((item) => item.id === id),
    false
  );
  await assert.rejects(store.saveCustomProgress(id, values("Stale")), /deleted/i);
});

test("invalid final submissions reject before any write and edits retain pins", async () => {
  const storage = createMemoryStorage();
  const store = client(storage);
  for (const draft of [
    values(""),
    values("P", { menubarTitle: " " }),
    values("P", { endDate: new Date(2026, 0, 1) }),
    values("P", { startDate: null }),
    values("P", { endDate: new Date(NaN) }),
  ]) {
    await assert.rejects(store.saveCustomProgress("custom:a", draft));
  }
  assert.equal(storage.writes.length, 0);
  await store.saveCustomProgress("custom:a", values(" A "));
  await store.setPinned("custom:a", true);
  await store.saveCustomProgress("custom:a", values("A", { menubarTitle: "New" }));
  assert.equal((await store.readProgress()).allProgress.find((item) => item.id === "custom:a").pinned, true);
  await assert.rejects(store.saveCustomProgress("custom:b", values("A")), /exist|unique|already/i);
  assert.equal((await store.readProgress()).allProgress.filter((item) => item.type === "user").length, 1);
});

test("writes are awaited and failures reject without continuing selection writes", async () => {
  const storage = createMemoryStorage();
  const store = client(storage);
  let release;
  storage.api.setItem = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  let completed = false;
  const save = store.saveCustomProgress("custom:a", values()).then(() => {
    completed = true;
  });
  while (!release) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false);
  release();
  await save;
  let count = 0;
  storage.api.setItem = async () => {
    count++;
    throw new Error("write unavailable");
  };
  await assert.rejects(store.saveCustomProgress("custom:b", values("B", { showAsCommand: true })), /write unavailable/);
  assert.equal(count, 1);
});

test("editing an unchanged stale checkbox preserves concurrent visibility and selection", async () => {
  const storage = createMemoryStorage();
  const a = client(storage);
  const b = client(storage);
  await a.saveCustomProgress("custom:a", values("A", { showInMenubar: true, showAsCommand: true }));
  const original = (await a.readProgress()).allProgress.find((item) => item.id === "custom:a");
  await b.setMenuBarVisible("custom:a", false);
  await b.selectCommand("default:month");
  await b.setPinned("custom:a", true);
  await a.saveCustomProgress(
    "custom:a",
    values("A", {
      menubarTitle: "Edited",
      showInMenubar: true,
      showAsCommand: true,
    }),
    original
  );
  const state = await a.readProgress();
  const updated = state.allProgress.find((item) => item.id === "custom:a");
  assert.equal(updated.menubar.title, "Edited");
  assert.equal(updated.menubar.shown, false);
  assert.equal(updated.pinned, true);
  assert.equal(state.commandProgressId, "default:month");
});

test("unknown edit fails and retrying creation reuses its ID without duplicating", async () => {
  const storage = createMemoryStorage();
  const store = client(storage);
  await store.saveCustomProgress("custom:a", values("A"));
  const original = (await store.readProgress()).allProgress.find((item) => item.id === "custom:a");
  await store.saveCustomProgress("custom:a", values("A"));
  assert.equal((await store.readProgress()).allProgress.filter((item) => item.type === "user").length, 1);
  delete storage.values[`${prefix}custom:custom:a`];
  await assert.rejects(store.saveCustomProgress("custom:a", values("A"), original), /no longer exists/);
});

test("malformed v2 overlay preserves valid legacy entry and reports recovery", async () => {
  const original = legacy();
  const storage = createMemoryStorage({
    xProgress: original,
    [`${prefix}custom:custom:legacy:1`]: JSON.stringify({ title: "Invalid", startDate: 2, endDate: 1 }),
  });
  const state = await client(storage).readProgress();
  assert.equal(state.allProgress.find((item) => item.id === "custom:legacy:1").title, "Project");
  assert.equal(state.storageWarnings.length, 1);
  assert.equal(storage.values.xProgress, original);
  assert.equal(storage.writes.length, 0);
});

test("valid JSON with the wrong legacy shape warns without resetting it", async () => {
  const storage = createMemoryStorage({ xProgress: "null" });
  const state = await client(storage).readProgress();
  assert.equal(state.storageWarnings.length, 1);
  assert.equal(storage.values.xProgress, "null");
  assert.equal(storage.writes.length, 0);
});
