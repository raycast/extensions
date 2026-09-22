import assert from "node:assert/strict";
import { test } from "node:test";
import { setupFromBlocked, type OwnedCategory } from "./focusSetup.ts";
import { blocksFromEvents } from "./sync.ts";
import type { FocusEvent, LoggedBlocks } from "./types.ts";

const travel: OwnedCategory = {
  id: "travel",
  title: "Travel",
  apps: [],
  websites: ["booking.com", "airbnb.com", "kayak.com"],
};
const messaging: OwnedCategory = {
  id: "messaging",
  title: "Messaging",
  apps: ["com.apple.FaceTime", "com.tinyspeck.slackmacgap"],
  websites: ["web.whatsapp.com"],
};
const owned = [travel, messaging];

const blocked = (apps: string[], websites: string[], mode: "block" | "allow" = "block"): LoggedBlocks => ({
  mode,
  apps,
  websites,
});

test("a category whose every member was blocked is named, not listed item by item", () => {
  const setup = setupFromBlocked("🎓 Course", blocked([], ["booking.com", "airbnb.com", "kayak.com"]), owned);
  assert.deepEqual(setup.categories, [{ id: "travel", title: "Travel" }]);
  assert.deepEqual(setup.skipped, []);
  assert.equal(setup.goal, "🎓 Course");
  assert.equal(setup.mode, "block");
});

test("whatever no category covers is stranded, so it can be given one", () => {
  const setup = setupFromBlocked(
    "🎓 Course",
    blocked(["com.apple.FaceTime"], ["booking.com", "airbnb.com", "kayak.com", "google.com", "youtube.com"]),
    owned,
  );
  assert.deepEqual(setup.categories, [{ id: "travel", title: "Travel" }]);
  assert.deepEqual(setup.skipped, [
    { id: "com.apple.FaceTime", title: "FaceTime", app: true },
    { id: "google.com", title: "google.com", app: false },
    { id: "youtube.com", title: "youtube.com", app: false },
  ]);
});

test("a category only partly blocked is not claimed as chosen", () => {
  const setup = setupFromBlocked("🎓 Course", blocked(["com.apple.FaceTime"], []), owned);
  assert.deepEqual(setup.categories, []);
  assert.deepEqual(
    setup.skipped.map((s) => s.id),
    ["com.apple.FaceTime"],
  );
});

test("an allowlist keeps its mode", () => {
  assert.equal(setupFromBlocked("Ship", blocked([], ["booking.com"], "allow"), owned).mode, "allow");
});

test("an empty category cannot match a session that blocked nothing of it", () => {
  const empty: OwnedCategory = { id: "empty", title: "Empty", apps: [], websites: [] };
  assert.deepEqual(setupFromBlocked("Ship", blocked([], ["booking.com"]), [empty]).categories, []);
});

const startEvent = (at: number, goal: string, b?: LoggedBlocks): FocusEvent => ({
  type: "start",
  at,
  goal,
  plannedSeconds: 60,
  ...(b ? { blocked: b } : {}),
});

test("blocksFromEvents learns a goal's blocks from the log, without Raycast's preferences", () => {
  const learned = blocksFromEvents(
    [startEvent(10, "🎓 Course", blocked([], ["booking.com", "airbnb.com", "kayak.com"]))],
    owned,
    {},
  );
  assert.deepEqual(learned["🎓 Course"], {
    categories: [{ id: "travel", title: "Travel" }],
    mode: "block",
    skipped: [],
  });
});

test("the latest start wins, so changing a goal's blocks is remembered", () => {
  const learned = blocksFromEvents(
    [
      startEvent(20, "🎓 Course", blocked(["com.apple.FaceTime"], [])),
      startEvent(10, "🎓 Course", blocked([], ["booking.com", "airbnb.com", "kayak.com"])),
    ],
    owned,
    {},
  );
  assert.deepEqual(
    learned["🎓 Course"].skipped.map((s) => s.id),
    ["com.apple.FaceTime"],
  );
});

test("Raycast 1 starts carry no blocklist, so what was already learned is kept", () => {
  const known = { Ship: { categories: [{ id: "social", title: "Social" }], mode: "block" as const, skipped: [] } };
  assert.deepEqual(blocksFromEvents([startEvent(10, "Ship")], owned, known), known);
});

test("a start with no goal cannot file blocks under an empty name", () => {
  assert.deepEqual(blocksFromEvents([startEvent(10, "", blocked([], ["booking.com"]))], owned, {}), {});
});
