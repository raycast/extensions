import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EARLY_REMINDER_OPTIONS,
  extractEarlyReminderFromText,
  formatEarlyReminder,
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

  describe("extractEarlyReminderFromText", () => {
    it("extracts 'remind me 30m before' and cleans title", () => {
      const result = extractEarlyReminderFromText("Haircut tomorrow 4pm remind me 30m before");
      assert.equal(result.earlyReminderSeconds, 1800);
      assert.equal(result.title, "Haircut tomorrow 4pm");
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

    it("extracts '1 day before'", () => {
      const result = extractEarlyReminderFromText("Submit tax documents 1 day before");
      assert.equal(result.earlyReminderSeconds, 86400);
      assert.equal(result.title, "Submit tax documents");
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

    it("resolves early reminder in non-AI fallback", () => {
      const input = "Submit presentation with 1 hour early alert #Work";
      const resolved = resolveQuickAddReminder({ title: input }, input, lists, baseNow);

      assert.equal(resolved.title, "Submit presentation");
      assert.equal(resolved.listId, "work-id");
      assert.equal(resolved.earlyReminder, 3600);
    });
  });
});
