// Run with: node --test test/profile.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";
import { filterTabsByProfile, getDisplayTitle, getUniqueProfiles, resolveSelectedProfile } from "../src/profile.ts";

test("getDisplayTitle prefixes profile", () => {
  assert.equal(getDisplayTitle({ title: "X", profileName: "Personal" }), "Personal — X");
});

test("getDisplayTitle without profile returns title", () => {
  assert.equal(getDisplayTitle({ title: "X" }), "X");
});

test("getDisplayTitle with blank profile returns title", () => {
  assert.equal(getDisplayTitle({ title: "X", profileName: "  " }), "X");
});

test("getUniqueProfiles returns unique non-empty in order", () => {
  assert.deepEqual(
    getUniqueProfiles([
      { profileName: "Personal" },
      { profileName: "dev" },
      { profileName: "Personal" },
      { profileName: "" },
      {},
      { profileName: "  " },
    ]),
    ["Personal", "dev"],
  );
});

test("filterTabsByProfile all returns all", () => {
  const tabs = [{ title: "A" }, { title: "B", profileName: "Personal" }];
  assert.deepEqual(filterTabsByProfile(tabs, "all"), tabs);
});

test("filterTabsByProfile filters by profile and hides unknown", () => {
  const tabs = [{ title: "A" }, { title: "B", profileName: "Personal" }, { title: "C", profileName: "dev" }];
  assert.deepEqual(filterTabsByProfile(tabs, "Personal"), [{ title: "B", profileName: "Personal" }]);
  assert.deepEqual(filterTabsByProfile(tabs, "Missing"), []);
});

test("resolveSelectedProfile falls back to all for stale value", () => {
  assert.equal(resolveSelectedProfile("all", ["Personal"]), "all");
  assert.equal(resolveSelectedProfile("Personal", ["Personal", "dev"]), "Personal");
  assert.equal(resolveSelectedProfile("Missing", ["Personal"]), "all");
  assert.equal(resolveSelectedProfile("Missing", []), "all");
});
