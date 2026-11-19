import assert from "node:assert/strict";
import test from "node:test";
import { getBackSeries, gbUnit, notifyLevel, nudgeCard, parseIslandHistory, riseLine } from "../src/mint-nudge.ts";

const REFERENCE = Date.UTC(2001, 0, 1);
const DAY = 86_400_000;
const now = Date.parse("2026-10-24T09:00:00Z");

/** island-history.json as IslandHistoryStore writes it: Foundation dates, Int64 bytes. */
function file(points: Array<[days: number, getBackBytes: number]>, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: 1,
    firstSeen: { "/Users/x/.codex/worktrees/a": (now - 3 * DAY - REFERENCE) / 1000 },
    baselineAt: (now - 20 * DAY - REFERENCE) / 1000,
    points: points.map(([days, bytes]) => ({
      date: (now + days * DAY - REFERENCE) / 1000,
      getBackBytes: bytes,
      worktreeBytes: 0,
      worktreeCount: 0,
    })),
    ...extra,
  });
}
const groups = { optimizableBytes: 700e6, safeToCleanBytes: 1_300e6, yoursBytes: 50e9, keepBytes: 371e9 };

test("the island's file is read as the app decodes it, its dates from 2001", () => {
  const points = parseIslandHistory(file([[-2, 5e9]]))!;
  assert.equal(points.length, 1);
  assert.equal(points[0].at, now - 2 * DAY);
  assert.equal(points[0].getBackBytes, 5e9);
});

test("a missing or malformed island file is no history, never an error", () => {
  assert.equal(parseIslandHistory(undefined), undefined);
  assert.equal(parseIslandHistory(""), undefined);
  assert.equal(parseIslandHistory("{not json"), undefined);
  assert.equal(parseIslandHistory(file([[-1, 1e9]], { version: 2 })), undefined);
  assert.equal(parseIslandHistory(file([[-1, 1e9]], { firstSeen: undefined })), undefined, "firstSeen is required");
  assert.equal(parseIslandHistory(file([[-1, 1.5]])), undefined, "bytes are Int64");
  assert.equal(parseIslandHistory(JSON.stringify({ version: 1, firstSeen: {}, points: [{ date: "x" }] })), undefined);
  // The card is still drawn, with no trend.
  const card = nudgeCard("1.1.2", groups, parseIslandHistory("{not json"), undefined, now)!;
  assert.equal(card.getBackBytes, 2e9);
  assert.deepEqual(card.series, []);
  assert.equal(card.rise, undefined);
});

test("Get back that rose draws its trend and says +X in 30 days, counting every rise", () => {
  // 1 → 4 (+3), cleaned to 0, 0 → 2 now (+2): 5 GB piled up, though the level is only 2.
  const history = parseIslandHistory(
    file([
      [-40, 9e9],
      [-20, 1e9],
      [-12, 4e9],
      [-5, 0],
    ]),
  )!;
  const series = getBackSeries(history, now, 2e9);
  assert.deepEqual(
    series.map((point) => point.gb),
    [0, 3, 3, 5],
    "the point older than 30 days is left out; now is added",
  );
  assert.equal(riseLine(series), "+5.0 GB in 30 days");
  const card = nudgeCard("1.1.2", groups, history, "Notify me · 5 GB", now)!;
  assert.equal(card.rise, "+5.0 GB in 30 days");
});

test("a flat or falling Get back draws no trend", () => {
  const flat = parseIslandHistory(
    file([
      [-10, 2e9],
      [-3, 2e9],
    ]),
  )!;
  assert.deepEqual(getBackSeries(flat, now, 2e9), []);
  const fell = parseIslandHistory(
    file([
      [-10, 9e9],
      [-3, 4e9],
    ]),
  )!;
  assert.deepEqual(getBackSeries(fell, now, 2e9), []);
  // Under the island's 0.05 GB, it has not risen.
  const tiny = parseIslandHistory(
    file([
      [-10, 2e9],
      [-3, 2.04e9],
    ]),
  )!;
  assert.deepEqual(getBackSeries(tiny, now, 2.04e9), []);
  // One Scan is the baseline: no trend yet.
  assert.deepEqual(getBackSeries(parseIslandHistory(file([[-3, 1e9]]))!, now, 9e9), []);
  assert.equal(riseLine([]), undefined);
});

test("the level is the person's, in the app's words, and never Mint's seed guessed", () => {
  assert.equal(notifyLevel("1", "5"), "Notify me · 5 GB");
  assert.equal(notifyLevel(undefined, "20"), "Notify me · 20 GB", "Notify me is on until turned off");
  assert.equal(notifyLevel("0", "10"), "Notify me · Off");
  assert.equal(notifyLevel("1", "7"), "Notify me · 5 GB", "a level Mint does not offer reads as 5, as the app reads it");
  assert.equal(notifyLevel(undefined, undefined), undefined, "never written: no level line");
  assert.equal(notifyLevel("1", undefined), undefined);
});

test("the level line names the setting as Mint 1.1.2 does: Notify me, then the bell's level", () => {
  for (const line of [notifyLevel("1", "10"), notifyLevel("false", "10")]) {
    assert.ok(line?.startsWith("Notify me · "), line);
  }
  assert.equal(notifyLevel("1", "10"), "Notify me · 10 GB", "on: the level the bell shows");
  assert.equal(notifyLevel("false", "10"), "Notify me · Off", "off: the bell's Off");
});

test("the card needs Mint 1.1.2 and the groups; the island speaks GB", () => {
  assert.equal(nudgeCard("1.1.1", groups, undefined, undefined, now), undefined);
  assert.equal(nudgeCard(undefined, groups, undefined, undefined, now), undefined);
  assert.equal(nudgeCard("1.1.2", undefined, undefined, undefined, now), undefined);
  assert.ok(nudgeCard("1.2", groups, undefined, undefined, now));
  assert.equal(gbUnit(29.74), "29.7 GB");
  assert.equal(gbUnit(120.4), "120 GB");
  assert.equal(gbUnit(-1), "0.0 GB");
});
