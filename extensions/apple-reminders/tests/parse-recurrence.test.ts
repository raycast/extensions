import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseRecurrence } from "../src/parse-recurrence";

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
