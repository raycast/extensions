const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function createStore(t, asyncOnly = false) {
  const supportPath = fs.mkdtempSync(path.join(os.tmpdir(), "wallpaper-history-"));
  t.after(() => fs.rmSync(supportPath, { recursive: true, force: true }));
  const source = fs.readFileSync(path.join(__dirname, "../src/history-store.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require: (id) => {
      if (id === "@raycast/api") return { environment: { supportPath } };
      if (id === "fs" && asyncOnly) return {
        ...fs,
        readFileSync: () => { throw new Error("Synchronous history read"); },
        readdirSync: () => { throw new Error("Synchronous history listing"); },
      };
      return require(id);
    },
    console,
  });
  const eventsDir = path.join(supportPath, "history/events");
  fs.mkdirSync(eventsDir, { recursive: true });
  function addEvent(eventId, wallpaperId, timestamp, eventType = "selected") {
    const entry = {
      eventId, eventType, timestamp,
      wallpaper: {
        id: wallpaperId, name: "Artwork", url: "https://example.com/art.jpg",
        description: "", artist: "Artist", creationDate: "1900",
      },
    };
    fs.writeFileSync(path.join(eventsDir, `${timestamp}-${eventId}.json`), JSON.stringify(entry));
    return entry;
  }
  return { store: exports, addEvent };
}

test("history returns each wallpaper once, using its latest event before applying the limit", async (t) => {
  const { store, addEvent } = createStore(t);
  addEvent("a-old", "a", "2026-01-01T00:00:00.000Z", "downloaded");
  addEvent("b", "b", "2026-01-02T00:00:00.000Z");
  addEvent("a-middle", "a", "2026-01-03T00:00:00.000Z");
  addEvent("a-new", "a", "2026-01-04T00:00:00.000Z", "auto-switched");
  const entries = await store.readWallpaperHistory({ limit: 2 });
  assert.equal(entries.length, 2);
  assert.equal(entries[0].eventId, "a-new");
  assert.equal(entries[0].eventType, "auto-switched");
  assert.equal(entries[1].wallpaper.id, "b");
  assert.equal(entries[0].events.length, 3);
  assert.equal(entries[0].events[0].eventId, "a-new");
  assert.equal(entries[0].events[1].eventId, "a-middle");
  assert.equal(entries[0].events[2].eventId, "a-old");
  assert.equal(entries[1].events.length, 1);
  const limited = await store.readWallpaperHistory({ limit: 1 });
  assert.equal(limited.length, 1);
  assert.equal(limited[0].events.length, 3);
});

test("deleting a wallpaper removes its older events without removing other wallpapers", async (t) => {
  const { store, addEvent } = createStore(t);
  addEvent("a-old", "a", "2026-01-01T00:00:00.000Z");
  addEvent("b", "b", "2026-01-02T00:00:00.000Z");
  addEvent("a-new", "a", "2026-01-03T00:00:00.000Z");
  assert.equal(store.deleteWallpaperHistoryEntry("a-new"), true);
  const remaining = await store.readWallpaperHistory();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].wallpaper.id, "b");
  assert.equal(store.deleteWallpaperHistoryEntry("a-new"), false);
});

test("search matches all words across artwork fields without case sensitivity", async (t) => {
  const { store, addEvent } = createStore(t);
  addEvent("a", "a", "2026-01-01T10:00:00.000Z");
  assert.equal((await store.searchWallpaperHistory({ query: "  ARTwork artist 1900 " })).length, 1);
  assert.equal((await store.searchWallpaperHistory({ query: "Artwork absent" })).length, 0);
  assert.equal((await store.searchWallpaperHistory({ query: "   " })).length, 1);
});

test("search uses older matching actions and orders results by those actions", async (t) => {
  const { store, addEvent } = createStore(t);
  addEvent("a-old", "a", new Date(2026, 0, 1, 10).toISOString(), "downloaded");
  addEvent("b", "b", new Date(2026, 0, 2, 10).toISOString(), "downloaded");
  addEvent("a-new", "a", new Date(2026, 0, 3, 10).toISOString(), "selected");
  const results = await store.searchWallpaperHistory({
    fromDate: "2026-01-01", toDate: "2026-01-02", eventType: "downloaded",
  });
  assert.equal(results.length, 2);
  assert.equal(results[0].wallpaper.id, "b");
  assert.equal(results[1].events.length, 1);
  assert.equal(results[1].events[0].eventId, "a-old");
});

test("search includes the entire local end date and excludes the next day", async (t) => {
  const { store, addEvent } = createStore(t);
  addEvent("start", "a", new Date(2026, 0, 1, 0, 0, 0).toISOString());
  addEvent("end", "a", new Date(2026, 0, 1, 23, 59, 59).toISOString());
  addEvent("next", "a", new Date(2026, 0, 2, 0, 0, 0).toISOString());
  const results = await store.searchWallpaperHistory({ fromDate: "2026-01-01", toDate: "2026-01-01" });
  assert.equal(results.length, 1);
  assert.equal(results[0].events.length, 2);
  assert.equal(results[0].events[0].eventId, "end");
  assert.equal(results[0].events[1].eventId, "start");
});

test("search rejects invalid dates and reversed ranges", async (t) => {
  const { store } = createStore(t);
  await assert.rejects(store.searchWallpaperHistory({ fromDate: "yesterday" }), /YYYY-MM-DD/);
  await assert.rejects(store.searchWallpaperHistory({ toDate: "2026-02-30" }), /Invalid history date/);
  await assert.rejects(store.searchWallpaperHistory({ fromDate: "2026-01-03", toDate: "2026-01-01" }), /start date/);
});

test("setting from history uses stored artwork and rejects unknown IDs", async (t) => {
  const { store, addEvent } = createStore(t);
  const saved = addEvent("a", "a", "2026-01-01T10:00:00.000Z");
  const source = fs.readFileSync(path.join(__dirname, "../src/tools/set-wallpaper-from-history.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const exports = {};
  const selected = [];
  vm.runInNewContext(outputText, {
    exports,
    require: (id) => {
      if (id === "../history-store") return store;
      if (id === "../utils") return { setDesktopWallpaper: async (wallpaper) => selected.push(wallpaper) };
      throw new Error(`Unexpected import: ${id}`);
    },
  });
  await assert.rejects(exports.default({ wallpaperId: "missing" }), /not found in history/);
  assert.equal(selected.length, 0);
  const result = await exports.default({ wallpaperId: "a" });
  assert.equal(result.status, "selected");
  assert.deepEqual(JSON.parse(JSON.stringify(selected[0])), saved.wallpaper);
});


test("Finder uses an older existing download after later actions or missing downloads", async (t) => {
  const { store, addEvent } = createStore(t);
  const downloadPath = path.join(os.tmpdir(), `wallpaper-download-${process.pid}.jpg`);
  fs.writeFileSync(downloadPath, "image");
  t.after(() => fs.rmSync(downloadPath, { force: true }));
  const downloaded = addEvent("download", "a", "2026-01-01T00:00:00.000Z", "downloaded");
  downloaded.downloadPath = downloadPath;
  const missing = { ...downloaded, eventId: "missing", downloadPath: `${downloadPath}-missing` };
  const selected = addEvent("selected", "a", "2026-01-03T00:00:00.000Z");
  assert.equal(await store.getExistingHistoryDownloadPath({ ...selected, events: [selected, missing, downloaded] }), downloadPath);
  assert.equal(await store.getExistingHistoryDownloadPath({ ...selected, events: [selected, missing] }), undefined);
});


test("async loading retains complete timelines across read batches without synchronous reads", async (t) => {
  const { store, addEvent } = createStore(t, true);
  for (let day = 1; day <= 40; day++) {
    addEvent(`event-${day}`, "a", new Date(2026, 0, day).toISOString());
  }
  addEvent("latest", "b", new Date(2026, 2, 1).toISOString());
  const entries = await store.readWallpaperHistory({ limit: 2 });
  assert.equal(entries.length, 2);
  assert.equal(entries[0].wallpaper.id, "b");
  assert.equal(entries[1].events.length, 40);
  assert.equal(entries[1].events[0].eventId, "event-40");
  assert.equal(entries[1].events[39].eventId, "event-1");
});
