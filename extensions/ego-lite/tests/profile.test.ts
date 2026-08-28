import assert from "node:assert/strict";
import test from "node:test";

import { profilePath, selectProfileDirectory } from "../src/lib/profile";

test("uses last_used when present", () => {
  assert.equal(
    selectProfileDirectory({ profile: { last_used: "Profile 2", info_cache: { Default: {} } } }),
    "Profile 2",
  );
});

test("falls back to the first info_cache profile", () => {
  assert.equal(
    selectProfileDirectory({ profile: { last_used: "", info_cache: { "Profile 1": {}, Default: {} } } }),
    "Profile 1",
  );
});

test("falls back to Default for malformed state", () => {
  assert.equal(selectProfileDirectory(null), "Default");
});

test("builds a path below the Ego Lite profile root", () => {
  assert.match(profilePath("Default", "History"), /Citro Labs\/ego lite\/Default\/History$/);
});
