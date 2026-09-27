import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_DAILY_GOAL, DEFAULT_LEAGUES, parseDailyGoal, parseLeagues, parsePreferences } from "./prefs.ts";

test("parseLeagues turns hours into ascending minutes", () => {
  assert.deepEqual(parseLeagues("10,20,40"), [600, 1200, 2400]);
});

test("parseLeagues tolerates whitespace around the values", () => {
  assert.deepEqual(parseLeagues("  10 , 20 ,40  "), [600, 1200, 2400]);
});

test("parseLeagues rounds fractional hours to whole minutes", () => {
  assert.deepEqual(parseLeagues("1.5,3,6"), [90, 180, 360]);
  assert.deepEqual(parseLeagues("0.51,1,2"), [31, 60, 120]);
});

test("parseLeagues needs exactly three values", () => {
  assert.deepEqual(parseLeagues("10,20"), DEFAULT_LEAGUES);
  assert.deepEqual(parseLeagues("10,20,40,80"), DEFAULT_LEAGUES);
});

test("parseLeagues rejects a ladder that does not ascend", () => {
  assert.deepEqual(parseLeagues("40,20,10"), DEFAULT_LEAGUES);
  assert.deepEqual(parseLeagues("10,10,40"), DEFAULT_LEAGUES);
});

test("parseLeagues rejects zero and negative thresholds", () => {
  assert.deepEqual(parseLeagues("0,20,40"), DEFAULT_LEAGUES);
  assert.deepEqual(parseLeagues("-10,20,40"), DEFAULT_LEAGUES);
});

test("parseLeagues falls back on empty, missing and malformed input", () => {
  assert.deepEqual(parseLeagues(""), DEFAULT_LEAGUES);
  assert.deepEqual(parseLeagues(undefined), DEFAULT_LEAGUES);
  assert.deepEqual(parseLeagues(","), DEFAULT_LEAGUES);
  assert.deepEqual(parseLeagues("ten,twenty,forty"), DEFAULT_LEAGUES);
  assert.deepEqual(parseLeagues("10,,40"), DEFAULT_LEAGUES);
});

test("parseLeagues keeps a trailing unit rather than discarding the ladder", () => {
  assert.deepEqual(parseLeagues("10h,20h,40h"), [600, 1200, 2400]);
});

test("the fallback ladder is the shared DEFAULT_LEAGUES array itself", () => {
  assert.equal(parseLeagues("nonsense"), DEFAULT_LEAGUES);
  assert.equal(parseLeagues(""), DEFAULT_LEAGUES);
});

test("parseDailyGoal takes a plain number of minutes", () => {
  assert.equal(parseDailyGoal("90"), 90);
  assert.equal(parseDailyGoal("1"), 1);
});

test("parseDailyGoal falls back on empty, missing and unparseable input", () => {
  assert.equal(parseDailyGoal(""), DEFAULT_DAILY_GOAL);
  assert.equal(parseDailyGoal(undefined), DEFAULT_DAILY_GOAL);
  assert.equal(parseDailyGoal("   "), DEFAULT_DAILY_GOAL);
  assert.equal(parseDailyGoal("abc"), DEFAULT_DAILY_GOAL);
});

test("parseDailyGoal refuses zero and negatives rather than marking every blank day hit", () => {
  assert.equal(parseDailyGoal("0"), DEFAULT_DAILY_GOAL);
  assert.equal(parseDailyGoal("-5"), DEFAULT_DAILY_GOAL);
});

test("parseDailyGoal keeps the number when a unit is typed after it", () => {
  assert.equal(parseDailyGoal("60min"), 60);
  assert.equal(parseDailyGoal(" 45 "), 45);
});

test("parseDailyGoal truncates a fractional entry rather than discarding it", () => {
  assert.equal(parseDailyGoal("30.5"), 30);
});

test("parsePreferences fills every field from an empty manifest", () => {
  assert.deepEqual(parsePreferences({}), {
    dailyGoal: DEFAULT_DAILY_GOAL,
    leagues: DEFAULT_LEAGUES,
    weekStartsOn: 1,
    menuBarFormat: "today",
  });
  assert.equal(parsePreferences({ weekStart: "sunday", menuBarFormat: "streak" }).weekStartsOn, 0);
  assert.equal(parsePreferences({ menuBarFormat: "streak" }).menuBarFormat, "streak");
  assert.equal(parsePreferences({ menuBarFormat: "bogus" }).menuBarFormat, "today");
});
