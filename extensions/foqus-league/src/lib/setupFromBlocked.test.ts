import assert from "node:assert/strict";
import { test } from "node:test";
import { builtinsAsLogged } from "./focusCategories.ts";
import { setupFromBlocked, type OwnedCategory } from "./focusSetup.ts";
import type { QuickStartMark } from "./store.ts";
import { blocksFromEvents, markQuickStart, QUICK_START_MS, type BlockMemory } from "./sync.ts";
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

test("a built-in category is still recognised when this Mac lacks some of its apps", () => {
  const streaming = {
    id: "streaming",
    title: "Streaming",
    apps: ["com.apple.TV", "com.plexapp.plexmediaserver"],
    websites: ["netflix.com", "hulu.com"],
    builtin: true,
  };
  const logged = blocked(["com.apple.TV"], ["netflix.com", "hulu.com"]);
  assert.deepEqual(setupFromBlocked("🌊 Flow", logged, [streaming]).categories, [], "Raycast 2 logs no missing app");

  const setup = setupFromBlocked("🌊 Flow", logged, builtinsAsLogged([streaming], new Set(["com.apple.TV"])));
  assert.deepEqual(setup.categories, [{ id: "streaming", title: "Streaming" }]);
  assert.deepEqual(setup.skipped, []);
});

test("categories that share a site are each recognised, not only the first one checked", () => {
  const social = { id: "social", title: "Social", apps: [], websites: ["x.com", "messenger.com"] };
  const chat = { id: "messaging", title: "Messaging", apps: [], websites: ["messenger.com", "web.whatsapp.com"] };
  const setup = setupFromBlocked("Ship", blocked([], ["x.com", "messenger.com", "web.whatsapp.com"]), [social, chat]);
  assert.deepEqual(
    setup.categories.map((c) => c.id),
    ["social", "messaging"],
  );
  assert.deepEqual(setup.skipped, []);
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

const memory = (goalBlocks: BlockMemory["goalBlocks"] = {}, quickStarts: QuickStartMark[] = []): BlockMemory => ({
  goalBlocks,
  quickStarts,
});

const TRAVEL_SITES = ["booking.com", "airbnb.com", "kayak.com"];
const FACETIME = { id: "com.apple.FaceTime", title: "FaceTime", app: true };

test("blocksFromEvents learns a goal's blocks from the log, without Raycast's preferences", () => {
  const learned = blocksFromEvents([startEvent(10, "🎓 Course", blocked([], TRAVEL_SITES))], owned, memory());
  assert.deepEqual(learned.goalBlocks["🎓 Course"], {
    categories: [{ id: "travel", title: "Travel" }],
    mode: "block",
    skipped: [],
  });
});

test("the latest start wins, so changing a goal's blocks is remembered", () => {
  const learned = blocksFromEvents(
    [
      startEvent(20, "🎓 Course", blocked(["com.apple.FaceTime"], [])),
      startEvent(10, "🎓 Course", blocked([], TRAVEL_SITES)),
    ],
    owned,
    memory(),
  );
  assert.deepEqual(
    learned.goalBlocks["🎓 Course"].skipped.map((s) => s.id),
    ["com.apple.FaceTime"],
  );
});

test("Raycast 1 starts carry no blocklist, so what was already learned is kept", () => {
  const known = { Ship: { categories: [{ id: "social", title: "Social" }], mode: "block" as const, skipped: [] } };
  assert.deepEqual(blocksFromEvents([startEvent(10, "Ship")], owned, memory(known)).goalBlocks, known);
});

test("a Raycast 2 start that blocked nothing clears what the goal used to block", () => {
  const known = { Ship: { categories: [{ id: "social", title: "Social" }], mode: "block" as const, skipped: [] } };
  const after = blocksFromEvents([startEvent(10, "Ship", blocked([], []))], owned, memory(known));
  assert.deepEqual(after.goalBlocks.Ship, { categories: [], mode: "block", skipped: [] });
});

test("a start with no goal cannot file blocks under an empty name", () => {
  assert.deepEqual(
    blocksFromEvents([startEvent(10, "", blocked([], ["booking.com"]))], owned, memory()).goalBlocks,
    {},
  );
});

test("when the category list cannot be read, a start from Raycast's form leaves what was learned alone", () => {
  const known = { Ship: { categories: [{ id: "travel", title: "Travel" }], mode: "block" as const, skipped: [] } };
  const after = blocksFromEvents([startEvent(10, "Ship", blocked([], ["booking.com"]))], null, memory(known));
  assert.deepEqual(after.goalBlocks, known);
});

const TRAVEL = { id: "travel", title: "Travel" };
const OWN = { id: "foqus-ship", title: "Foqus Ship" };
const CLICK = 100_000;
const mark = (categories = [TRAVEL, OWN]): QuickStartMark => ({ goal: "Ship", at: CLICK, categories });
const stranded = memory({ Ship: { categories: [TRAVEL], mode: "block", skipped: [FACETIME] } }, [mark()]);
const quickStart = (b: LoggedBlocks) => startEvent(CLICK + 800, "Ship", b);

test("a quick start that blocked the stranded apps proves the goal's own category exists", () => {
  const after = blocksFromEvents([quickStart(blocked(["com.apple.FaceTime"], TRAVEL_SITES))], owned, stranded);
  assert.deepEqual(after.goalBlocks.Ship, { categories: [TRAVEL, OWN], mode: "block", skipped: [] });
  assert.deepEqual(after.quickStarts, [{ ...mark(), start: CLICK + 800 }]);
});

test("a quick start whose own category does not exist yet keeps what it could not carry", () => {
  const after = blocksFromEvents([quickStart(blocked([], TRAVEL_SITES))], owned, stranded);
  assert.deepEqual(after.goalBlocks.Ship, { categories: [TRAVEL], mode: "block", skipped: [FACETIME] });
});

test("a quick start replays the categories it asked for instead of guessing them from the log", () => {
  const after = blocksFromEvents([quickStart(blocked([], ["booking.com"]))], null, stranded);
  assert.deepEqual(after.goalBlocks.Ship.categories, [TRAVEL], "even when no category list could be read");
});

test("an own category, once proven, stays through later quick starts", () => {
  const proven = memory({ Ship: { categories: [TRAVEL, OWN], mode: "block", skipped: [] } }, [mark()]);
  const after = blocksFromEvents([quickStart(blocked(["com.apple.FaceTime"], TRAVEL_SITES))], owned, proven);
  assert.deepEqual(after.goalBlocks.Ship.categories, [TRAVEL, OWN]);
});

test("reading the same quick start again, as overlapping syncs do, changes nothing", () => {
  const events = [quickStart(blocked([], TRAVEL_SITES))];
  const once = blocksFromEvents(events, owned, stranded);
  assert.deepEqual(blocksFromEvents(events, owned, once), once);
});

test("a retry from Raycast's form after a quick start that blocked nothing is not taken as proof", () => {
  const retry = blocksFromEvents(
    [
      startEvent(CLICK + 800, "Ship"),
      startEvent(CLICK + 10_800, "Ship", blocked(["com.apple.FaceTime"], TRAVEL_SITES)),
    ],
    owned,
    stranded,
  );
  assert.deepEqual(retry.goalBlocks.Ship.categories, [TRAVEL]);
  assert.deepEqual(
    retry.goalBlocks.Ship.skipped.map((s) => s.id),
    ["com.apple.FaceTime"],
  );
});

test("a start before the click is never mistaken for the quick start", () => {
  const early = blocksFromEvents(
    [startEvent(CLICK - 5_000, "Ship", blocked(["com.apple.FaceTime"], TRAVEL_SITES))],
    owned,
    stranded,
  );
  assert.equal(early.quickStarts[0].start, undefined);
  assert.ok(!early.goalBlocks.Ship.categories.some((c) => c.id === OWN.id));
});

test("the quick-start mark covers only the same goal, started right after the click", () => {
  const late = blocksFromEvents(
    [startEvent(CLICK + QUICK_START_MS + 1, "Ship", blocked([], TRAVEL_SITES))],
    owned,
    stranded,
  );
  assert.deepEqual(late.goalBlocks.Ship.skipped, [], "a start from Raycast's form is taken as it is");
  assert.deepEqual(late.quickStarts, [mark()]);

  const other = blocksFromEvents([startEvent(CLICK + 800, "Read", blocked([], TRAVEL_SITES))], owned, stranded);
  assert.deepEqual(other.quickStarts, [mark()]);
});

const READ_MARK: QuickStartMark = { goal: "Read", at: CLICK + 5_000, categories: [TRAVEL] };

test("a quick start clicked for another goal before the sync reads this one does not hide it", () => {
  const both = memory(stranded.goalBlocks, [mark(), READ_MARK]);
  const after = blocksFromEvents([quickStart(blocked([], TRAVEL_SITES))], owned, both);
  assert.deepEqual(after.goalBlocks.Ship.skipped, [FACETIME]);
});

test("a re-read after another goal's click still finds the quick start it was bound to", () => {
  const once = blocksFromEvents([quickStart(blocked([], TRAVEL_SITES))], owned, stranded);
  const later = memory(once.goalBlocks, [...once.quickStarts, READ_MARK]);
  assert.deepEqual(blocksFromEvents([quickStart(blocked([], TRAVEL_SITES))], owned, later).goalBlocks, once.goalBlocks);
});

test("two clicks on one goal each bind their own start", () => {
  const second: QuickStartMark = { ...mark(), at: CLICK + 20_000 };
  const after = blocksFromEvents(
    [quickStart(blocked([], TRAVEL_SITES)), startEvent(CLICK + 20_500, "Ship", blocked([], TRAVEL_SITES))],
    owned,
    memory(stranded.goalBlocks, [mark(), second]),
  );
  assert.deepEqual(
    after.quickStarts.map((m) => m.start),
    [CLICK + 800, CLICK + 20_500],
  );
  assert.deepEqual(after.goalBlocks.Ship.skipped, [FACETIME], "neither start is mistaken for Raycast's form");
});

test("marks are kept for twelve hours and eight clicks at most", () => {
  const now = 50 * 3_600_000;
  const old: QuickStartMark = { goal: "Old", at: now - 13 * 3_600_000, categories: [] };
  const recent = Array.from({ length: 8 }, (_, i): QuickStartMark => ({ goal: `G${i}`, at: now - i, categories: [] }));
  const marks = markQuickStart([old, ...recent], "Ship", [TRAVEL], now);
  assert.equal(marks.length, 8);
  assert.ok(!marks.some((m) => m.goal === "Old"));
  assert.deepEqual(marks.at(-1), { goal: "Ship", at: now, categories: [TRAVEL] });
});
