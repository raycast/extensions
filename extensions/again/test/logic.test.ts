// Run with `npm test`. Day logic checks, plus the cases found in the 22/10 expert review.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  answer,
  answerDay,
  atFloor,
  autoClose,
  baseOf,
  clearToday,
  correctionDay,
  dayKey,
  dayLabel,
  daysBetween,
  offers,
  reopen,
  screenFor,
  setPromise,
  showedUp,
  smaller,
  type State,
} from "../src/logic.ts";

test("day boundary", () => {
  assert.equal(dayKey(new Date(2026, 9, 21, 2, 30)), "2026-10-20", "2:30 a.m. belongs to yesterday");
  assert.equal(dayKey(new Date(2026, 9, 21, 3, 59)), "2026-10-20", "3:59 is still yesterday");
  assert.equal(dayKey(new Date(2026, 9, 21, 4, 1)), "2026-10-21", "4:01 is today");
  assert.equal(dayKey(new Date(2026, 2, 29, 4, 30)), "2026-03-29", "the day turns at 4 on the night the clocks change");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-03-29", 1), "2026-03-30");
  assert.equal(daysBetween("2026-10-18", "2026-10-21"), 3);
});

test("smaller is a ladder with a floor", () => {
  assert.equal(smaller("Study 30 minutes"), "Study 15 minutes");
  assert.equal(smaller("Read 3 min"), "Read 2 minutes");
  assert.equal(smaller("Read 2 minutes"), "Open it, nothing else: Read 2 minutes");
  const s1 = smaller("Call the dentist");
  const s2 = smaller(s1);
  assert.equal(s1, "Spend 2 minutes on: Call the dentist");
  assert.equal(s2, "Open it, nothing else: Call the dentist");
  assert.equal(smaller(s2), s2, "the last rung stays put");
  assert.ok(atFloor(s2) && !atFloor(s1));
  assert.equal(baseOf(s1), "Call the dentist");
  assert.equal(baseOf(s2), "Call the dentist");
});

test("smaller keeps the person's own words", () => {
  assert.equal(smaller("ADHD meds"), "Spend 2 minutes on: ADHD meds", "no lower-casing of acronyms");
  assert.equal(baseOf(smaller("iPhone backup")), "iPhone backup", "no upper-casing either");
  assert.equal(smaller("Walk 10-15 minutes"), "Spend 2 minutes on: Walk 10-15 minutes", "ranges are not halved");
});

test("offers, labels and auto-close", () => {
  let s: State = { days: {} };
  assert.equal(screenFor(s, "2026-10-01"), "first");
  s.days["2026-10-01"] = { promise: "Spend 2 minutes on: Call the dentist", outcome: "done" };
  let o = offers(s, "2026-10-02");
  assert.notEqual(o[0].text, "Spend 2 minutes on: Call the dentist");
  assert.equal(o.at(-1)?.text, "Call the dentist");
  assert.equal(o.at(-1)?.label, "Repeat");

  s.days["2026-10-02"] = { promise: "Close five tabs", outcome: "not" }; // answered "not today"
  o = offers(s, "2026-10-03");
  assert.equal(o[0].text, "Spend 2 minutes on: Close five tabs");
  assert.equal(o[0].label, "Smaller");
  assert.equal(o[1].text, "Close five tabs");
  assert.equal(o[1].label, "Same");
  assert.ok(!o.slice(2).some((x) => x.text === "Close five tabs"), "no duplicates");

  s.days["2026-10-03"] = { promise: "Reply to one message" }; // left open
  s = autoClose(s, "2026-10-04");
  assert.equal(s.days["2026-10-03"].outcome, "not");
  assert.equal(s.days["2026-10-03"].auto, true);
  o = offers(s, "2026-10-04");
  assert.equal(o[0].text, "Reply to one message", "after an unanswered day the plain thing comes first");
  assert.equal(o[0].label, "Same");
  assert.equal(o[1].label, "Smaller");
  assert.equal(correctionDay(s, "2026-10-04"), "2026-10-03");
  assert.equal(correctionDay(s, "2026-10-08"), null, "too old to correct");
  s = answerDay(s, "2026-10-03", "done");
  assert.equal(s.days["2026-10-03"].auto, undefined);
  assert.equal(correctionDay(s, "2026-10-04"), null);
});

test("labels stay on the right text when smaller equals the base", () => {
  const s: State = { days: { "2026-10-01": { promise: "Open it, nothing else: Call the dentist", outcome: "not" } } };
  const o = offers(s, "2026-10-02");
  assert.equal(o[0].text, "Open it, nothing else: Call the dentist");
  assert.equal(o[0].label, "Same");
  assert.equal(o[1].text, "Call the dentist");
  assert.equal(o[1].label, undefined, "a label is used once");
});

test("welcome back", () => {
  const s: State = { days: { "2026-10-01": { promise: "Clear the desk", outcome: "not" } } };
  assert.equal(screenFor(s, "2026-10-03"), "choose", "two days away is still a normal day");
  assert.equal(screenFor(s, "2026-10-04"), "welcome-back", "three days away opens on welcome back");
  const o = offers(s, "2026-10-04");
  assert.equal(o[0].text, "Reply to one message");
  assert.equal(o.at(-1)?.label, "Where You Left Off");
});

test("answering and changing the answer", () => {
  const day = "2026-10-22";
  let s: State = { days: {} };
  assert.equal(setPromise(s, day, "   "), s, "blank text sets nothing");
  s = setPromise(s, day, "  Write one sentence  ");
  assert.equal(s.days[day].promise, "Write one sentence");
  assert.equal(screenFor(s, day), "promise");
  s = answer(s, day, "some");
  assert.equal(screenFor(s, day), "closed");
  assert.equal(showedUp(s), 1);
  s = reopen(s, day);
  assert.equal(showedUp(s), 1, "reopening does not take the day away");
  assert.equal(s.days[day].prev, "some");
  s = answer(s, day, "done");
  assert.equal(s.days[day].prev, undefined);
  assert.equal(answer({ days: {} }, day, "done").days[day], undefined, "no answer without a thing");
});

test("the number never goes down", () => {
  const day = "2026-10-22";
  let s = answer(setPromise({ days: {} }, day, "Close five tabs"), day, "done");
  assert.equal(showedUp(s), 1);
  s = reopen(s, day);
  s = clearToday(s, day);
  assert.equal(showedUp(s), 1, "pick another thing after reopening");
  assert.equal(screenFor(s, day), "first", "an emptied day offers a choice again");
  s = setPromise(s, day, "Reply to one message");
  assert.equal(showedUp(s), 1, "a new thing keeps the earlier answer");
  s = autoClose(s, "2026-10-23");
  assert.equal(s.days[day].outcome, "done", "left open after change: the earlier answer returns");
  assert.equal(showedUp(s), 1);
  // typing a new thing over a closed day (the command argument) keeps the count too
  const t = setPromise(answer(setPromise({ days: {} }, day, "A"), day, "some"), day, "B");
  assert.equal(showedUp(t), 1);
});

test("changing a counted day to not today does not lower the number", () => {
  const day = "2026-10-22";
  for (const first of ["done", "some"] as const) {
    let s = answer(setPromise({ days: {} }, day, "Close five tabs"), day, first);
    s = answer(reopen(s, day), day, "not");
    assert.equal(showedUp(s), 1, `${first} then not today`);
    s = answer(reopen(s, day), day, "not");
    assert.equal(showedUp(s), 1, "and again");
    s = clearToday(reopen(s, day), day);
    assert.equal(showedUp(s), 1, "pick another thing after that");
    s = autoClose(setPromise(s, day, "Reply to one message"), "2026-10-23");
    assert.equal(showedUp(s), 1, "left open afterwards");
  }
  // a day that never counted can still be changed freely
  const s = answer(answer(setPromise({ days: {} }, day, "A"), day, "not"), day, "done");
  assert.equal(showedUp(s), 1);
});

test("an older correctable day is named by its weekday", () => {
  assert.equal(dayLabel("2026-10-21", "2026-10-22"), "Yesterday");
  assert.equal(dayLabel("2026-10-19", "2026-10-21"), "Monday");
});
