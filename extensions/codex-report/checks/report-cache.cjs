const assert = require("node:assert/strict");
const test = require("node:test");
const { createReportCache } = require("../.test-build/report-cache.js");

const report = { schemaVersion: 1, generatedAt: "2026-10-05T12:00:00Z", days: [], agentDays: [] };
function storage() {
  const entries = new Map();
  return { get: (key) => entries.get(key), set: (key, value) => entries.set(key, value), clear: () => entries.clear() };
}

test("reopening a command restores the last successful report without a CLI read", () => {
  const disk = storage();
  const firstOpening = createReportCache(disk);
  firstOpening.write("six-months:all", report);
  const reopened = createReportCache(disk);
  assert.deepEqual(reopened.read("six-months:all"), report);
  assert.equal(reopened.read("twelve-months:all"), undefined);
  assert.equal(reopened.read("six-months:claude"), undefined);
});

test("refresh invalidates every stored window and cache corruption falls back to loading", () => {
  const disk = storage();
  const cache = createReportCache(disk);
  cache.write("six", report);
  cache.write("twelve", report);
  cache.clear();
  assert.equal(cache.read("six"), undefined);
  assert.equal(cache.read("twelve"), undefined);
  for (const broken of ["not json", "null", JSON.stringify({ ...report, schemaVersion: 2 }), JSON.stringify({ schemaVersion: 1 })]) {
    disk.set("broken", broken);
    assert.equal(cache.read("broken"), undefined);
  }
});

test("unavailable cache storage never prevents reporting", () => {
  const fail = () => { throw new Error("Disk unavailable"); };
  const cache = createReportCache({ get: fail, set: fail, clear: fail });
  assert.equal(cache.read("anything"), undefined);
  assert.doesNotThrow(() => cache.write("anything", report));
  assert.doesNotThrow(() => cache.clear());
});
