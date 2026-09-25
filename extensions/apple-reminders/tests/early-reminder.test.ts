import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EARLY_REMINDER_OPTIONS,
  extractEarlyReminderFromText,
  formatEarlyReminder,
  formatEarlyReminderShort,
} from "../src/helpers/early-reminder";
import { resolveQuickAddReminder } from "../src/quick-add-reminder-parser";

describe("Early Reminder Helpers", () => {
  describe("formatEarlyReminder", () => {
    it("returns empty string for missing, zero, or negative seconds", () => {
      assert.equal(formatEarlyReminder(undefined), "");
      assert.equal(formatEarlyReminder(null), "");
      assert.equal(formatEarlyReminder(0), "");
      assert.equal(formatEarlyReminder(-300), "");
    });

    it("formats standard intervals correctly", () => {
      assert.equal(formatEarlyReminder(300), "5 minutes before");
      assert.equal(formatEarlyReminder(900), "15 minutes before");
      assert.equal(formatEarlyReminder(1800), "30 minutes before");
      assert.equal(formatEarlyReminder(3600), "1 hour before");
      assert.equal(formatEarlyReminder(7200), "2 hours before");
      assert.equal(formatEarlyReminder(86400), "1 day before");
      assert.equal(formatEarlyReminder(172800), "2 days before");
      assert.equal(formatEarlyReminder(604800), "1 week before");
      assert.equal(formatEarlyReminder(2592000), "1 month before");
    });

    it("formats custom non-standard intervals", () => {
      assert.equal(formatEarlyReminder(600), "10 minutes before");
      assert.equal(formatEarlyReminder(10800), "3 hours before");
      assert.equal(formatEarlyReminder(259200), "3 days before");
    });
  });

  describe("formatEarlyReminderShort", () => {
    it("returns empty string for missing, zero, or negative seconds", () => {
      assert.equal(formatEarlyReminderShort(undefined), "");
      assert.equal(formatEarlyReminderShort(null), "");
      assert.equal(formatEarlyReminderShort(0), "");
      assert.equal(formatEarlyReminderShort(-300), "");
    });

    it("formats concise short intervals", () => {
      assert.equal(formatEarlyReminderShort(300), "5m before");
      assert.equal(formatEarlyReminderShort(900), "15m before");
      assert.equal(formatEarlyReminderShort(1800), "30m before");
      assert.equal(formatEarlyReminderShort(3600), "1h before");
      assert.equal(formatEarlyReminderShort(7200), "2h before");
      assert.equal(formatEarlyReminderShort(86400), "1d before");
      assert.equal(formatEarlyReminderShort(604800), "1w before");
      assert.equal(formatEarlyReminderShort(2592000), "1mo before");
    });
  });

  describe("extractEarlyReminderFromText", () => {
    it("extracts 'remind me 30m before' and cleans title", () => {
      const result = extractEarlyReminderFromText("Haircut tomorrow 4pm remind me 30m before");
      assert.equal(result.earlyReminderSeconds, 1800);
      assert.equal(result.title, "Haircut tomorrow 4pm");
    });

    it("extracts 'remind me 30 minutes' without 'before' and consumes whole unit word", () => {
      const result = extractEarlyReminderFromText("Dentist tomorrow 3pm remind me 30 minutes #Personal");
      assert.equal(result.earlyReminderSeconds, 1800);
      assert.equal(result.title, "Dentist tomorrow 3pm #Personal");
    });

    it("extracts 'remind me 15 minutes' without leaving remind me or partial words in title", () => {
      const result = extractEarlyReminderFromText("Meeting tomorrow 3pm remind me 15 minutes");
      assert.equal(result.earlyReminderSeconds, 900);
      assert.equal(result.title, "Meeting tomorrow 3pm");
    });

    it("extracts 'with 15 min early reminder'", () => {
      const result = extractEarlyReminderFromText("Team standup Friday 10am with 15 min early reminder");
      assert.equal(result.earlyReminderSeconds, 900);
      assert.equal(result.title, "Team standup Friday 10am");
    });

    it("extracts '1 hour early'", () => {
      const result = extractEarlyReminderFromText("Doctor appointment 1 hour early");
      assert.equal(result.earlyReminderSeconds, 3600);
      assert.equal(result.title, "Doctor appointment");
    });

    it("extracts 'early reminder: 2 hours'", () => {
      const result = extractEarlyReminderFromText("Submit report early reminder: 2 hours");
      assert.equal(result.earlyReminderSeconds, 7200);
      assert.equal(result.title, "Submit report");
    });

    it("does not extract early reminder when there is no explicit cue (e.g. 2 days before the demo)", () => {
      const result = extractEarlyReminderFromText("Review PR 2 days before the demo tomorrow");
      assert.equal(result.earlyReminderSeconds, null);
      assert.equal(result.title, "Review PR 2 days before the demo tomorrow");
    });

    it("returns null when no early reminder phrase exists", () => {
      const result = extractEarlyReminderFromText("Buy milk tomorrow at 5pm #Groceries");
      assert.equal(result.earlyReminderSeconds, null);
      assert.equal(result.title, "Buy milk tomorrow at 5pm #Groceries");
    });
  });

  describe("Quick Add Integration with Early Reminder", () => {
    const lists = [
      { id: "work-id", title: "Work" },
      { id: "personal-id", title: "Personal" },
    ];
    const baseNow = new Date("2026-09-25T10:00:00.000Z");

    it("resolves early reminder with due date and list tag", () => {
      const input = "Dentist tomorrow 3pm remind me 30m before #Personal";
      const resolved = resolveQuickAddReminder({ title: input }, input, lists, baseNow);

      assert.equal(resolved.title, "Dentist");
      assert.equal(resolved.listId, "personal-id");
      assert.equal(resolved.earlyReminder, 1800);
      assert.ok(resolved.dueDate);
    });

    it("resolves early reminder in non-AI fallback with due date", () => {
      const input = "Submit presentation tomorrow 2pm with 1 hour early alert #Work";
      const resolved = resolveQuickAddReminder({ title: input }, input, lists, baseNow);

      assert.equal(resolved.title, "Submit presentation");
      assert.equal(resolved.listId, "work-id");
      assert.equal(resolved.earlyReminder, 3600);
      assert.ok(resolved.dueDate);
    });

    it("does not set early reminder when no due date exists", () => {
      const input = "Submit presentation with 1 hour early alert #Work";
      const resolved = resolveQuickAddReminder({ title: input }, input, lists, baseNow);

      assert.equal(resolved.title, "Submit presentation with 1 hour early alert");
      assert.equal(resolved.listId, "work-id");
      assert.equal(resolved.earlyReminder, undefined);
      assert.equal(resolved.dueDate, undefined);
    });

    it("extracts missing due date from original input when AI returns cleaned title", () => {
      const input = "Call mom tomorrow at 9 with 15 min early reminder #Personal";
      const aiResponse = { title: "Call mom" };
      const resolved = resolveQuickAddReminder(aiResponse, input, lists, baseNow);

      assert.equal(resolved.title, "Call mom");
      assert.equal(resolved.listId, "personal-id");
      assert.equal(resolved.earlyReminder, 900);
      assert.ok(resolved.dueDate);
    });
  });
});
