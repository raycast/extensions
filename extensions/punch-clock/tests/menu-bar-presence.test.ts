import assert from "node:assert/strict";
import { test } from "node:test";
import { isMenuBarHeartbeatFresh, MENU_BAR_HEARTBEAT_TTL_MS } from "../src/menu-bar-presence.ts";

const now = 1_700_000_000_000;

test("a recent menu-bar heartbeat counts as the countdown being visible", () => {
  assert.equal(isMenuBarHeartbeatFresh(String(now - 1_000), now), true);
  assert.equal(isMenuBarHeartbeatFresh(String(now - MENU_BAR_HEARTBEAT_TTL_MS), now), true);
});

test("a missing, legacy, or expired marker does not count as visible", () => {
  assert.equal(isMenuBarHeartbeatFresh(undefined, now), false);
  assert.equal(isMenuBarHeartbeatFresh("true", now), false);
  assert.equal(isMenuBarHeartbeatFresh(String(now - MENU_BAR_HEARTBEAT_TTL_MS - 1), now), false);
});
