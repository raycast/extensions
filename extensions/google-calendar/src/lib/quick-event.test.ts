import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseQuickEventInput } from "./quick-event";

describe("quick event parsing", () => {
  const referenceDate = new Date(2026, 7, 1, 14, 30);

  it("creates an all-day event for an explicit all-day phrase", () => {
    const event = parseQuickEventInput("Company Offsite August 3 all day", referenceDate);
    assert.equal(event.title, "Company Offsite");
    assert.equal(event.allDay, true);
    assert.deepEqual(
      [event.startTime?.getFullYear(), event.startTime?.getMonth(), event.startTime?.getDate()],
      [2026, 7, 3],
    );
  });

  it("treats a date without a time as all-day instead of using the current time", () => {
    const event = parseQuickEventInput("Vacation tomorrow", referenceDate);
    assert.equal(event.title, "Vacation");
    assert.equal(event.allDay, true);
    assert.deepEqual(
      [event.startTime?.getFullYear(), event.startTime?.getMonth(), event.startTime?.getDate()],
      [2026, 7, 2],
    );
  });

  it("preserves timed-event parsing when a time is explicit", () => {
    const event = parseQuickEventInput("Team meeting tomorrow at 3pm", referenceDate);
    assert.equal(event.title, "Team meeting");
    assert.equal(event.allDay, false);
    assert.equal(event.startTime?.getHours(), 15);
  });

  it("keeps the natural-language end date inclusive for all-day ranges", () => {
    const event = parseQuickEventInput("Offsite August 3 through August 5", referenceDate);
    assert.equal(event.allDay, true);
    assert.equal(event.endTime?.getDate(), 5);
  });
});
