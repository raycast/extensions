import assert from "node:assert/strict";
import {
  detectBestCalendar,
  parseDetails,
  parseDuration,
  parseWhen,
  parseWhenSpec,
  smartLocationCase,
  smartTitleCase,
} from "../src/lib/parse.ts";
import { buildQuickAddPlan } from "../src/lib/quick-add-plan.ts";

assert.equal(smartTitleCase("dinner with alex"), "Dinner with Alex");
assert.equal(smartTitleCase("API study"), "API Study");
assert.equal(smartLocationCase("nhs"), "NHS");
assert.equal(smartLocationCase("miller and carter"), "Miller and Carter");
assert.equal(smartLocationCase("mcdonalds"), "McDonald's");
assert.equal(parseDuration("1h20m"), 80);
assert.equal(parseDuration("1h 30m"), 90);
assert.equal(parseDuration("1.5h"), 90);
assert.deepEqual(parseDetails("1h20m@Miller and Carter"), {
  durationMinutes: 80,
  location: "Miller and Carter",
  description: "",
});
assert.deepEqual(parseDetails("45m @ https://meet.google.com/abc-defg-hij"), {
  durationMinutes: 45,
  location: "",
  description: "Meeting link: https://meet.google.com/abc-defg-hij",
});
assert.deepEqual(parseDetails(undefined, 1440), {
  durationMinutes: 1440,
  location: "",
  description: "",
});
assert.equal(detectBestCalendar("Date night"), "Shared");
assert.equal(detectBestCalendar("Meeting with client"), "Work");
assert.equal(detectBestCalendar("Dinner with Nan"), "Family");
assert.equal(detectBestCalendar("Dentist"), "Personal");

const fixedNow = new Date(2026, 8, 6, 19, 0, 0, 0); // Sun 6 Sep 2026, local time
const monday = parseWhen("mon 10am", fixedNow);
assert.equal(monday.getFullYear(), 2026);
assert.equal(monday.getMonth(), 8);
assert.equal(monday.getDate(), 7);
assert.equal(monday.getHours(), 10);
assert.equal(monday.getMinutes(), 0);

const nextThursday = parseWhen("next thu 5pm", fixedNow);
assert.equal(nextThursday.getDate(), 17);
assert.equal(nextThursday.getHours(), 17);

const tomorrow = parseWhenSpec("tomorrow", fixedNow, "day-month");
assert.equal(tomorrow.kind, "all-day");
assert.equal(tomorrow.start.getDate(), 7);

const friday = parseWhenSpec("Friday", fixedNow, "day-month");
assert.equal(friday.kind, "all-day");
assert.equal(friday.start.getDate(), 11);

const ukDate = parseWhenSpec("15/09", fixedNow, "day-month");
assert.equal(ukDate.kind, "all-day");
assert.equal(ukDate.start.getMonth(), 8);
assert.equal(ukDate.start.getDate(), 15);
assert.throws(
  () => parseWhenSpec("09/15", fixedNow, "day-month"),
  /Invalid DD\/MM date/,
);

const usDate = parseWhenSpec("09/15", fixedNow, "month-day");
assert.equal(usDate.kind, "all-day");
assert.equal(usDate.start.getMonth(), 8);
assert.equal(usDate.start.getDate(), 15);
assert.throws(
  () => parseWhenSpec("15/09", fixedNow, "month-day"),
  /Invalid MM\/DD date/,
);

const isoDate = parseWhenSpec("2026-09-15", fixedNow, "month-day");
assert.equal(isoDate.kind, "all-day");
assert.equal(isoDate.start.getDate(), 15);

const ukTimed = parseWhenSpec("15/09 5pm", fixedNow, "day-month");
assert.equal(ukTimed.kind, "timed");
assert.equal(ukTimed.start.getDate(), 15);
assert.equal(ukTimed.start.getHours(), 17);

const usTimed = parseWhenSpec("09/15 5pm", fixedNow, "month-day");
assert.equal(usTimed.kind, "timed");
assert.equal(usTimed.start.getDate(), 15);
assert.equal(usTimed.start.getHours(), 17);

const oneDay = buildQuickAddPlan(
  { title: "annual leave", when: "Friday" },
  "day-month",
  fixedNow,
);
assert.equal(oneDay.kind, "all-day");
if (oneDay.kind === "all-day") {
  assert.equal(oneDay.startDate, "2026-09-11");
  assert.equal(oneDay.endDate, "2026-09-12");
  assert.equal(oneDay.durationDays, 1);
  assert.deepEqual(oneDay.googlePayload, {
    start: { date: "2026-09-11" },
    end: { date: "2026-09-12" },
  });
}

const threeDay = buildQuickAddPlan(
  { title: "annual leave", when: "Friday", details: "3d" },
  "day-month",
  fixedNow,
);
assert.equal(threeDay.kind, "all-day");
if (threeDay.kind === "all-day") {
  assert.equal(threeDay.endDate, "2026-09-14");
  assert.equal(threeDay.durationDays, 3);
}

assert.throws(
  () =>
    buildQuickAddPlan(
      { title: "annual leave", when: "Friday", details: "2h" },
      "day-month",
      fixedNow,
    ),
  /whole-day duration/,
);

const timedDefault = buildQuickAddPlan(
  { title: "meeting", when: "Friday 5pm" },
  "day-month",
  fixedNow,
);
assert.equal(timedDefault.kind, "timed");
if (timedDefault.kind === "timed") {
  assert.equal(timedDefault.durationMinutes, 60);
  assert.equal(
    timedDefault.end.getTime() - timedDefault.start.getTime(),
    60 * 60_000,
  );
}

console.log("✅ parser tests passed");
