import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAppleScriptDate,
  buildCreateCalendarEventScript,
  escapeAppleScriptString,
  parseCalendarListResult,
} from "../src/helpers/calendar";

describe("Calendar Helpers", () => {
  describe("parseCalendarListResult", () => {
    it("parses linefeed-delimited list of calendar names and deduplicates", () => {
      const raw = "Work\nPersonal\nWork\nHome";
      const result = parseCalendarListResult(raw);
      assert.deepEqual(result, ["Work", "Personal", "Home"]);
    });

    it("filters out empty or whitespace-only names", () => {
      const raw = "Work\n\n   \nPersonal";
      const result = parseCalendarListResult(raw);
      assert.deepEqual(result, ["Work", "Personal"]);
    });

    it("handles calendar names containing quotes and special characters", () => {
      const raw = 'Work "Primary"\nPersonal & Family\nJane\'s Calendar';
      const result = parseCalendarListResult(raw);
      assert.deepEqual(result, ['Work "Primary"', "Personal & Family", "Jane's Calendar"]);
    });

    it("returns empty array for empty or undefined input", () => {
      assert.deepEqual(parseCalendarListResult(undefined), []);
      assert.deepEqual(parseCalendarListResult(""), []);
      assert.deepEqual(parseCalendarListResult("   \n\n  "), []);
    });
  });

  describe("escapeAppleScriptString", () => {
    it("escapes backslashes and double quotes correctly", () => {
      const input = 'Meeting with "VIP" client \\ test';
      const escaped = escapeAppleScriptString(input);
      assert.equal(escaped, 'Meeting with \\"VIP\\" client \\\\ test');
    });

    it("leaves regular strings untouched", () => {
      const input = "Normal calendar event title";
      assert.equal(escapeAppleScriptString(input), "Normal calendar event title");
    });
  });

  describe("buildAppleScriptDate", () => {
    it("generates locale-independent AppleScript date setter statements with day reset", () => {
      const date = new Date(2026, 8, 25, 14, 30, 45); // Sept 25, 2026 14:30:45
      const script = buildAppleScriptDate(date, "testDate");

      assert.ok(script.includes("set testDate to current date"));
      assert.ok(script.includes("set day of testDate to 1"));
      assert.ok(script.includes("set year of testDate to 2026"));
      assert.ok(script.includes("set month of testDate to 9"));
      assert.ok(script.includes("set day of testDate to 25"));
      assert.ok(script.includes("set hours of testDate to 14"));
      assert.ok(script.includes("set minutes of testDate to 30"));
      assert.ok(script.includes("set seconds of testDate to 45"));

      // Verify day reset occurs before year/month setter to prevent month rollover
      const dayOneIndex = script.indexOf("set day of testDate to 1");
      const monthIndex = script.indexOf("set month of testDate to 9");
      assert.ok(dayOneIndex < monthIndex, "Day must be set to 1 before month is set");
    });
  });

  describe("buildCreateCalendarEventScript", () => {
    const startDate = new Date(2026, 8, 25, 10, 0, 0);
    const endDate = new Date(2026, 8, 25, 11, 0, 0);

    it("builds script targeting specific calendar with full properties", () => {
      const script = buildCreateCalendarEventScript({
        calendarName: "Work Calendar",
        title: 'Review "Q3 Budget"',
        startDate,
        endDate,
        isAllDay: false,
        notes: "Discuss with team\nDetails here",
        location: "Room 101",
        url: "x-apple-reminderkit://remind/12345",
      });

      assert.ok(script.includes('tell application "Calendar"'));
      assert.ok(script.includes('set cal to first calendar whose name is "Work Calendar"'));
      assert.ok(script.includes('summary:"Review \\"Q3 Budget\\""'));
      assert.ok(script.includes("start date:startDate"));
      assert.ok(script.includes("end date:endDate"));
      assert.ok(script.includes("allday event:false"));
      assert.ok(script.includes('description:"Discuss with team\nDetails here"'));
      assert.ok(script.includes('location:"Room 101"'));
      assert.ok(script.includes('url:"x-apple-reminderkit://remind/12345"'));
      assert.ok(script.includes("make new event at end of events of cal with properties {"));
    });

    it("builds script targeting default writable calendar when calendarName is omitted", () => {
      const script = buildCreateCalendarEventScript({
        title: "All-Day Milestone",
        startDate,
        endDate,
        isAllDay: true,
      });

      assert.ok(script.includes("set cal to first calendar whose writable is true"));
      assert.ok(script.includes("allday event:true"));
      assert.ok(!script.includes("description:"));
      assert.ok(!script.includes("location:"));
      assert.ok(!script.includes("url:"));
    });

    it("adjusts single-day all-day event end date to exclusive next day (+1 day)", () => {
      const eventDate = new Date(2026, 8, 25);
      const script = buildCreateCalendarEventScript({
        title: "Single Day All-Day",
        startDate: eventDate,
        endDate: eventDate,
        isAllDay: true,
      });

      assert.ok(script.includes("set day of startDate to 25"));
      assert.ok(script.includes("set hours of startDate to 0"));
      assert.ok(script.includes("set minutes of startDate to 0"));
      assert.ok(script.includes("set seconds of startDate to 0"));

      assert.ok(script.includes("set day of endDate to 26"));
      assert.ok(script.includes("set hours of endDate to 0"));
      assert.ok(script.includes("set minutes of endDate to 0"));
      assert.ok(script.includes("set seconds of endDate to 0"));
    });

    it("adjusts multi-day all-day event end date to exclusive next day after last selected day", () => {
      const start = new Date(2026, 8, 25);
      const end = new Date(2026, 8, 27);
      const script = buildCreateCalendarEventScript({
        title: "Multi-Day Conference",
        startDate: start,
        endDate: end,
        isAllDay: true,
      });

      assert.ok(script.includes("set day of startDate to 25"));
      assert.ok(script.includes("set day of endDate to 28"));
    });
  });
});
