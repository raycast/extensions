import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseRecurrence, resolveDueDateFromNlp } from "../src/parse-recurrence";

describe("parseRecurrence", () => {
  it("parses daily recurrence phrases", () => {
    assert.deepEqual(parseRecurrence("daily"), { frequency: "daily", interval: 1, matchedText: "daily" });
    assert.deepEqual(parseRecurrence("every day"), { frequency: "daily", interval: 1, matchedText: "every day" });
    assert.deepEqual(parseRecurrence("each day"), { frequency: "daily", interval: 1, matchedText: "each day" });
    assert.deepEqual(parseRecurrence("every day at 5pm"), { frequency: "daily", interval: 1, matchedText: "every day" });
    assert.deepEqual(parseRecurrence("every other day"), { frequency: "daily", interval: 2, matchedText: "every other day" });
    assert.deepEqual(parseRecurrence("every 3 days"), { frequency: "daily", interval: 3, matchedText: "every 3 days" });
  });

  it("parses weekday recurrence phrases", () => {
    assert.deepEqual(parseRecurrence("weekdays"), { frequency: "weekdays", interval: 1, matchedText: "weekdays" });
    assert.deepEqual(parseRecurrence("every weekday"), { frequency: "weekdays", interval: 1, matchedText: "every weekday" });
    assert.deepEqual(parseRecurrence("on weekdays at 9am"), { frequency: "weekdays", interval: 1, matchedText: "on weekdays" });
    assert.deepEqual(parseRecurrence("mon-fri 8am"), { frequency: "weekdays", interval: 1, matchedText: "mon-fri" });
    assert.deepEqual(parseRecurrence("monday through friday"), { frequency: "weekdays", interval: 1, matchedText: "monday through friday" });
  });

  it("parses weekend recurrence phrases", () => {
    assert.deepEqual(parseRecurrence("weekends"), { frequency: "weekends", interval: 1, matchedText: "weekends" });
    assert.deepEqual(parseRecurrence("every weekend"), { frequency: "weekends", interval: 1, matchedText: "every weekend" });
    assert.deepEqual(parseRecurrence("on weekends at 10am"), { frequency: "weekends", interval: 1, matchedText: "on weekends" });
    assert.deepEqual(parseRecurrence("sat-sun 10am"), { frequency: "weekends", interval: 1, matchedText: "sat-sun" });
  });

  it("parses weekly recurrence phrases", () => {
    assert.deepEqual(parseRecurrence("weekly"), { frequency: "weekly", interval: 1, matchedText: "weekly" });
    assert.deepEqual(parseRecurrence("every week"), { frequency: "weekly", interval: 1, matchedText: "every week" });
    assert.deepEqual(parseRecurrence("every 2 weeks"), { frequency: "weekly", interval: 2, matchedText: "every 2 weeks" });
    assert.deepEqual(parseRecurrence("biweekly"), { frequency: "weekly", interval: 2, matchedText: "biweekly" });
    assert.deepEqual(parseRecurrence("bi-weekly"), { frequency: "weekly", interval: 2, matchedText: "bi-weekly" });
    assert.deepEqual(parseRecurrence("fortnightly"), { frequency: "weekly", interval: 2, matchedText: "fortnightly" });
    assert.deepEqual(parseRecurrence("every other week"), { frequency: "weekly", interval: 2, matchedText: "every other week" });
    assert.deepEqual(parseRecurrence("every friday at 10am"), { frequency: "weekly", interval: 1, matchedText: "every friday" });
    assert.deepEqual(parseRecurrence("every monday"), { frequency: "weekly", interval: 1, matchedText: "every monday" });
    assert.deepEqual(parseRecurrence("each tuesday"), { frequency: "weekly", interval: 1, matchedText: "each tuesday" });
    assert.deepEqual(parseRecurrence("every other friday"), { frequency: "weekly", interval: 2, matchedText: "every other friday" });
  });

  it("parses monthly recurrence phrases", () => {
    assert.deepEqual(parseRecurrence("monthly"), { frequency: "monthly", interval: 1, matchedText: "monthly" });
    assert.deepEqual(parseRecurrence("every month"), { frequency: "monthly", interval: 1, matchedText: "every month" });
    assert.deepEqual(parseRecurrence("every 3 months"), { frequency: "monthly", interval: 3, matchedText: "every 3 months" });
    assert.deepEqual(parseRecurrence("bimonthly"), { frequency: "monthly", interval: 2, matchedText: "bimonthly" });
    assert.deepEqual(parseRecurrence("every other month"), { frequency: "monthly", interval: 2, matchedText: "every other month" });
    assert.deepEqual(parseRecurrence("quarterly"), { frequency: "monthly", interval: 3, matchedText: "quarterly" });
    assert.deepEqual(parseRecurrence("semi-annually"), { frequency: "monthly", interval: 6, matchedText: "semi-annually" });
    assert.deepEqual(parseRecurrence("every 6 months"), { frequency: "monthly", interval: 6, matchedText: "every 6 months" });
  });

  it("parses yearly recurrence phrases", () => {
    assert.deepEqual(parseRecurrence("yearly"), { frequency: "yearly", interval: 1, matchedText: "yearly" });
    assert.deepEqual(parseRecurrence("annually"), { frequency: "yearly", interval: 1, matchedText: "annually" });
    assert.deepEqual(parseRecurrence("every year"), { frequency: "yearly", interval: 1, matchedText: "every year" });
    assert.deepEqual(parseRecurrence("every 2 years"), { frequency: "yearly", interval: 2, matchedText: "every 2 years" });
    assert.deepEqual(parseRecurrence("every other year"), { frequency: "yearly", interval: 2, matchedText: "every other year" });
  });

  it("returns null for non-recurring text", () => {
    assert.equal(parseRecurrence(""), null);
    assert.equal(parseRecurrence("   "), null);
    assert.equal(parseRecurrence("tomorrow at 5pm"), null);
    assert.equal(parseRecurrence("in 2 hours"), null);
    assert.equal(parseRecurrence("next friday 10am"), null);
    assert.equal(parseRecurrence("April 5th"), null);
  });
});

describe("resolveDueDateFromNlp", () => {
  const fixedNow = new Date(2026, 8, 24, 10, 0, 0); // Thursday, Sep 24, 2026 10:00 AM

  it("sets start date to now (today) for interval recurrence phrases without future offset", () => {
    const r1 = resolveDueDateFromNlp("every 2 weeks", fixedNow);
    assert.deepEqual(r1.recurrence, { frequency: "weekly", interval: 2, matchedText: "every 2 weeks" });
    assert.equal(r1.dueDate?.getTime(), fixedNow.getTime());

    const r2 = resolveDueDateFromNlp("every 1 week", fixedNow);
    assert.deepEqual(r2.recurrence, { frequency: "weekly", interval: 1, matchedText: "every 1 week" });
    assert.equal(r2.dueDate?.getTime(), fixedNow.getTime());

    const r3 = resolveDueDateFromNlp("every 3 days", fixedNow);
    assert.deepEqual(r3.recurrence, { frequency: "daily", interval: 3, matchedText: "every 3 days" });
    assert.equal(r3.dueDate?.getTime(), fixedNow.getTime());

    const r4 = resolveDueDateFromNlp("every 1 day", fixedNow);
    assert.deepEqual(r4.recurrence, { frequency: "daily", interval: 1, matchedText: "every 1 day" });
    assert.equal(r4.dueDate?.getTime(), fixedNow.getTime());

    const r5 = resolveDueDateFromNlp("every week", fixedNow);
    assert.deepEqual(r5.recurrence, { frequency: "weekly", interval: 1, matchedText: "every week" });
    assert.equal(r5.dueDate?.getTime(), fixedNow.getTime());

    const r6 = resolveDueDateFromNlp("every day", fixedNow);
    assert.deepEqual(r6.recurrence, { frequency: "daily", interval: 1, matchedText: "every day" });
    assert.equal(r6.dueDate?.getTime(), fixedNow.getTime());

    const r7 = resolveDueDateFromNlp("every half year", fixedNow);
    assert.deepEqual(r7.recurrence, { frequency: "monthly", interval: 6, matchedText: "every half year" });
    assert.equal(r7.dueDate?.getTime(), fixedNow.getTime());

    const r8 = resolveDueDateFromNlp("every 6 months", fixedNow);
    assert.deepEqual(r8.recurrence, { frequency: "monthly", interval: 6, matchedText: "every 6 months" });
    assert.equal(r8.dueDate?.getTime(), fixedNow.getTime());
  });

  it("applies parsed time to today for interval recurrence with time when time is in the future", () => {
    const fixedMorning = new Date(2026, 8, 24, 6, 0, 0); // 6am Thursday

    const r1 = resolveDueDateFromNlp("every 2 weeks at 10am", fixedMorning);
    assert.deepEqual(r1.recurrence, { frequency: "weekly", interval: 2, matchedText: "every 2 weeks" });
    assert.ok(r1.dueDate);
    assert.equal(r1.dueDate.getFullYear(), fixedMorning.getFullYear());
    assert.equal(r1.dueDate.getMonth(), fixedMorning.getMonth());
    assert.equal(r1.dueDate.getDate(), fixedMorning.getDate());
    assert.equal(r1.dueDate.getHours(), 10);
    assert.equal(r1.parsedDueDate?.isDateTime, true);

    const r2 = resolveDueDateFromNlp("every 3 days at 9am", fixedMorning);
    assert.deepEqual(r2.recurrence, { frequency: "daily", interval: 3, matchedText: "every 3 days" });
    assert.ok(r2.dueDate);
    assert.equal(r2.dueDate.getFullYear(), fixedMorning.getFullYear());
    assert.equal(r2.dueDate.getMonth(), fixedMorning.getMonth());
    assert.equal(r2.dueDate.getDate(), fixedMorning.getDate());
    assert.equal(r2.dueDate.getHours(), 9);
    assert.equal(r2.parsedDueDate?.isDateTime, true);

    const r3 = resolveDueDateFromNlp("every 1 week at 8am", fixedMorning);
    assert.deepEqual(r3.recurrence, { frequency: "weekly", interval: 1, matchedText: "every 1 week" });
    assert.ok(r3.dueDate);
    assert.equal(r3.dueDate.getFullYear(), fixedMorning.getFullYear());
    assert.equal(r3.dueDate.getMonth(), fixedMorning.getMonth());
    assert.equal(r3.dueDate.getDate(), fixedMorning.getDate());
    assert.equal(r3.dueDate.getHours(), 8);
    assert.equal(r3.parsedDueDate?.isDateTime, true);

    const r4 = resolveDueDateFromNlp("mon-fri 8am", fixedMorning);
    assert.deepEqual(r4.recurrence, { frequency: "weekdays", interval: 1, matchedText: "mon-fri" });
    assert.ok(r4.dueDate);
    assert.equal(r4.dueDate.getDate(), fixedMorning.getDate());
    assert.equal(r4.dueDate.getHours(), 8);
    assert.equal(r4.parsedDueDate?.isDateTime, true);
  });

  it("rolls start date forward when phrase time has already passed today", () => {
    const fixedAfternoon = new Date(2026, 8, 24, 14, 0, 0); // 2pm Thursday

    const r1 = resolveDueDateFromNlp("every day at 9am", fixedAfternoon);
    assert.deepEqual(r1.recurrence, { frequency: "daily", interval: 1, matchedText: "every day" });
    assert.ok(r1.dueDate);
    assert.equal(r1.dueDate.getDate(), 25); // Friday (tomorrow)
    assert.equal(r1.dueDate.getHours(), 9);
    assert.equal(r1.parsedDueDate?.isDateTime, true);

    const r2 = resolveDueDateFromNlp("daily 9am", fixedAfternoon);
    assert.deepEqual(r2.recurrence, { frequency: "daily", interval: 1, matchedText: "daily" });
    assert.ok(r2.dueDate);
    assert.equal(r2.dueDate.getDate(), 25); // Friday (tomorrow)
    assert.equal(r2.dueDate.getHours(), 9);

    const r3 = resolveDueDateFromNlp("weekdays at 9am", fixedAfternoon);
    assert.deepEqual(r3.recurrence, { frequency: "weekdays", interval: 1, matchedText: "weekdays" });
    assert.ok(r3.dueDate);
    assert.equal(r3.dueDate.getDate(), 25); // Friday (tomorrow)
    assert.equal(r3.dueDate.getHours(), 9);

    const r4 = resolveDueDateFromNlp("mon-fri 8am", fixedAfternoon);
    assert.deepEqual(r4.recurrence, { frequency: "weekdays", interval: 1, matchedText: "mon-fri" });
    assert.ok(r4.dueDate);
    assert.equal(r4.dueDate.getDate(), 25); // Friday (tomorrow)
    assert.equal(r4.dueDate.getHours(), 8);
  });

  it("preserves explicit start date/time when specified with recurrence", () => {
    const r = resolveDueDateFromNlp("every Friday 10am", fixedNow);
    assert.deepEqual(r.recurrence, { frequency: "weekly", interval: 1, matchedText: "every Friday" });
    assert.ok(r.dueDate);
    assert.notEqual(r.dueDate.getTime(), fixedNow.getTime());
    assert.equal(r.dueDate.getHours(), 10);
    assert.equal(r.dueDate.getDay(), 5); // Friday

    const r2 = resolveDueDateFromNlp("every 2 weeks starting next Friday", fixedNow);
    assert.deepEqual(r2.recurrence, { frequency: "weekly", interval: 2, matchedText: "every 2 weeks" });
    assert.ok(r2.dueDate);
    assert.equal(r2.dueDate.getDay(), 5); // Friday
    assert.ok(r2.dueDate.getTime() > fixedNow.getTime());
  });

  it("preserves next weekday as start date for weekday recurring phrases", () => {
    // fixedNow is Thursday (day 4), so next Friday is day 5 (2026-09-25)
    const r1 = resolveDueDateFromNlp("every Friday", fixedNow);
    assert.deepEqual(r1.recurrence, { frequency: "weekly", interval: 1, matchedText: "every Friday" });
    assert.ok(r1.dueDate);
    assert.equal(r1.dueDate.getDay(), 5); // Friday
    assert.ok(r1.dueDate.getTime() > fixedNow.getTime());

    const r2 = resolveDueDateFromNlp("every other friday", fixedNow);
    assert.deepEqual(r2.recurrence, { frequency: "weekly", interval: 2, matchedText: "every other friday" });
    assert.ok(r2.dueDate);
    assert.equal(r2.dueDate.getDay(), 5); // Friday
    assert.ok(r2.dueDate.getTime() > fixedNow.getTime());

    const r3 = resolveDueDateFromNlp("every Monday", fixedNow);
    assert.deepEqual(r3.recurrence, { frequency: "weekly", interval: 1, matchedText: "every Monday" });
    assert.ok(r3.dueDate);
    assert.equal(r3.dueDate.getDay(), 1); // Monday

    const r4 = resolveDueDateFromNlp("each Tuesday", fixedNow);
    assert.deepEqual(r4.recurrence, { frequency: "weekly", interval: 1, matchedText: "each Tuesday" });
    assert.ok(r4.dueDate);
    assert.equal(r4.dueDate.getDay(), 2); // Tuesday
  });

  it("handles non-recurring relative durations correctly", () => {
    const r = resolveDueDateFromNlp("in 2 weeks", fixedNow);
    assert.equal(r.recurrence, null);
    assert.ok(r.dueDate);
    assert.ok(r.dueDate.getTime() > fixedNow.getTime());
  });
});
