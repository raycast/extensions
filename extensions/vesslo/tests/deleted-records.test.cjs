const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { deletedRecords } = require(
  path.join(process.env.VESSLO_TEST_BUILD, "utils/deleted-records.js"),
);

const record = (overrides = {}) => ({
  id: "deleted",
  name: "Old App",
  bundleId: "example.old",
  path: "/record/Old.app",
  developer: "Old Developer",
  tags: ["archive"],
  memo: "Retired utility",
  isDeleted: true,
  ...overrides,
});

test("deleted-record search never includes installed counterparts with the same identity fields", () => {
  const deleted = record();
  const installed = record({ id: "installed", isDeleted: false });
  assert.deepEqual(deletedRecords([installed, deleted], "example.old"), [
    deleted,
  ]);
  assert.deepEqual(deletedRecords([installed], "Old"), []);
});

test("deleted-record search matches retained metadata without requiring a live path", () => {
  const deleted = record();
  for (const query of [
    " OLD ",
    "EXAMPLE.OLD",
    "developer",
    "archive",
    "retired",
    "/record/",
  ]) {
    assert.deepEqual(deletedRecords([deleted], query), [deleted]);
  }
  assert.deepEqual(deletedRecords([deleted], "missing"), []);
});

test("deleted-record sort is stable and does not mutate the exported inventory", () => {
  const z = record({ id: "z", name: "Zed" });
  const a = record({ id: "a", name: "Alpha" });
  const input = Object.freeze([z, a]);
  assert.deepEqual(deletedRecords(input), [a, z]);
  assert.deepEqual(input, [z, a]);
});
