import assert from "node:assert/strict";
import test from "node:test";
import { applyPrimarySelection } from "../src/selection";
import { menuBarTitle } from "../src/formatting";
const settings: Preferences = {
  threshold: "30",
  menuBarStyle: "remaining",
  primaryProfile: "dev",
  notifyOnSignOut: false,
};
test("menu selection overrides its original preference, but a later preference change wins", () => {
  const selection = { name: "production", preference: "dev" };
  assert.equal(applyPrimarySelection(settings, selection).primaryProfile, "production");
  assert.equal(
    applyPrimarySelection({ ...settings, primaryProfile: "personal" }, selection).primaryProfile,
    "personal",
  );
  assert.equal(applyPrimarySelection(settings, null).primaryProfile, "dev");
  assert.equal(applyPrimarySelection(settings, { name: 42, preference: "dev" }).primaryProfile, "dev");
});
test("cached results keep time while refreshing; stale simple mode never claims readiness", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  const item = {
    profile: { name: "dev", issues: [] },
    status: "Signed In" as const,
    expiration: "2026-01-01T00:42:00Z",
  };
  const loading = true;
  assert.equal(menuBarTitle(item, settings, loading, now), "42m");
  assert.equal(menuBarTitle({ ...item, stale: true }, { ...settings, menuBarStyle: "status" }, false, now), "✕");
  assert.equal(menuBarTitle(undefined, settings, true, now), "…");
});
