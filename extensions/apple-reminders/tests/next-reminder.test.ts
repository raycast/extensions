import assert from "node:assert";
import { describe, it } from "node:test";

import {
  findNextReminder,
  formatRelativeDue,
  isListSelected,
  parseMinutesPreference,
  pruneDismissed,
  resolveListSelection,
  shouldHideMenuBar,
  toggleListSelection,
} from "../src/helpers/next-reminder";
import type { Reminder } from "../src/hooks/useData";

const now = new Date("2026-10-09T10:00:00Z");

function reminder(id: string, dueDate: string | null, overrides: Partial<Reminder> = {}): Reminder {
  return {
    id,
    openUrl: `x-apple-reminderkit://REMCDReminder/${id}`,
    title: id,
    notes: "",
    dueDate,
    isCompleted: false,
    priority: null,
    completionDate: "",
    isRecurring: "",
    recurrenceRule: "",
    list: { id: "work", title: "Work", color: "#00f" },
    ...overrides,
  };
}

const at = (minutesFromNow: number) => new Date(now.getTime() + minutesFromNow * 60_000).toISOString();

describe("findNextReminder", () => {
  const options = { showBeforeMinutes: 15, hideAfterMinutes: null };

  it("shows a reminder inside the window before it's due", () => {
    const match = findNextReminder([reminder("soon", at(8)), reminder("later", at(40))], now, options);
    assert.strictEqual(match?.reminder.id, "soon");
    assert.strictEqual(match?.status, "upcoming");
  });

  it("shows nothing when the next reminder is outside the window", () => {
    assert.strictEqual(findNextReminder([reminder("later", at(40))], now, options), undefined);
  });

  it("always shows the next one when the window is open-ended", () => {
    const match = findNextReminder([reminder("later", at(40))], now, { ...options, showBeforeMinutes: null });
    assert.strictEqual(match?.reminder.id, "later");
  });

  it("keeps a due reminder until completed, or for the hide-after time", () => {
    const due = [reminder("due", at(-20))];
    assert.strictEqual(findNextReminder(due, now, options)?.status, "current");
    assert.strictEqual(findNextReminder(due, now, { ...options, hideAfterMinutes: 15 }), undefined);
  });

  it("drops an unfinished reminder from an earlier day, even when kept until completed", () => {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(20, 0, 0, 0);
    assert.strictEqual(findNextReminder([reminder("old", yesterday.toISOString())], now, options), undefined);
  });

  it("prefers the reminder that's due now over an upcoming one", () => {
    const match = findNextReminder([reminder("next", at(5)), reminder("now", at(-2))], now, options);
    assert.strictEqual(match?.reminder.id, "now");
  });

  it("skips completed, all-day and other-list reminders", () => {
    const reminders = [
      reminder("done", at(5), { isCompleted: true }),
      reminder("allDay", "2026-10-09"),
      reminder("home", at(5), { list: { id: "home", title: "Home", color: "#0f0" } }),
    ];
    assert.strictEqual(findNextReminder(reminders, now, { ...options, lists: ["work"] }), undefined);
    assert.strictEqual(findNextReminder(reminders, now, options)?.reminder.id, "home");
  });

  it("shows nothing when no list is selected", () => {
    assert.strictEqual(findNextReminder([reminder("soon", at(5))], now, { ...options, lists: [] }), undefined);
  });
});

describe("dismissing", () => {
  const options = { showBeforeMinutes: 15, hideAfterMinutes: null };

  it("skips a dismissed reminder and shows the next one", () => {
    const soon = reminder("soon", at(3));
    const match = findNextReminder([soon, reminder("next", at(10))], now, {
      ...options,
      dismissed: { soon: soon.dueDate as string },
    });
    assert.strictEqual(match?.reminder.id, "next");
  });

  it("shows a dismissed reminder again once it's rescheduled", () => {
    const match = findNextReminder([reminder("soon", at(3))], now, { ...options, dismissed: { soon: at(-60) } });
    assert.strictEqual(match?.reminder.id, "soon");
  });

  it("forgets dismissals for completed, removed or rescheduled reminders", () => {
    const kept = reminder("kept", at(3));
    const pruned = pruneDismissed({ kept: kept.dueDate as string, gone: at(1), moved: at(2) }, [
      kept,
      reminder("moved", at(30)),
    ]);
    assert.deepStrictEqual(pruned, { kept: kept.dueDate });
  });
});

describe("formatRelativeDue", () => {
  it("formats minutes, hours and the past", () => {
    assert.strictEqual(formatRelativeDue(new Date(at(8)), now), "in 8m");
    assert.strictEqual(formatRelativeDue(new Date(at(65)), now), "in 1h 05m");
    assert.strictEqual(formatRelativeDue(new Date(at(-5)), now), "5m ago");
    assert.strictEqual(formatRelativeDue(now, now), "now");
  });
});

describe("parseMinutesPreference", () => {
  it("reads numbers and open-ended values", () => {
    assert.strictEqual(parseMinutesPreference("15", 60), 15);
    assert.strictEqual(parseMinutesPreference("always", 60), null);
    assert.strictEqual(parseMinutesPreference("completed", 5), null);
    assert.strictEqual(parseMinutesPreference(undefined, 60), 60);
  });
});

describe("list selection", () => {
  it("uses the stored selection, including an empty one", () => {
    assert.deepStrictEqual(resolveListSelection(["work", "home"], undefined), ["work", "home"]);
    assert.deepStrictEqual(resolveListSelection([], "work"), []);
    assert.strictEqual(resolveListSelection("all", "work"), "all");
  });

  it("falls back to the older single-list choice before it's migrated", () => {
    assert.deepStrictEqual(resolveListSelection(undefined, "work"), ["work"]);
  });

  it("shows all lists when nothing valid is stored", () => {
    assert.strictEqual(resolveListSelection(undefined, undefined), "all");
    assert.strictEqual(resolveListSelection([1, 2], ""), "all");
    assert.strictEqual(resolveListSelection({ id: "work" }, null), "all");
  });

  it("toggles lists without falling back to all lists", () => {
    assert.deepStrictEqual(toggleListSelection("all", "work"), ["work"]);
    assert.deepStrictEqual(toggleListSelection(["work"], "home"), ["work", "home"]);
    assert.deepStrictEqual(toggleListSelection(["work", "home"], "work"), ["home"]);
    assert.deepStrictEqual(toggleListSelection(["work"], "work"), []);
    assert.strictEqual(toggleListSelection([], undefined), "all");
  });

  it("matches lists against the selection", () => {
    assert.strictEqual(isListSelected("all", undefined), true);
    assert.strictEqual(isListSelected(["work"], "work"), true);
    assert.strictEqual(isListSelected(["work"], "home"), false);
    assert.strictEqual(isListSelected(["work"], undefined), false);
    assert.strictEqual(isListSelected([], "work"), false);
  });
});

describe("shouldHideMenuBar", () => {
  const base = {
    hideWhenNothingDue: true,
    nextReminderEnabled: true,
    isLoading: false,
    hasNextReminder: false,
    lists: "all" as const,
  };

  it("hides when nothing is due and the option is on", () => {
    assert.strictEqual(shouldHideMenuBar(base), true);
    assert.strictEqual(shouldHideMenuBar({ ...base, hasNextReminder: true }), false);
    assert.strictEqual(shouldHideMenuBar({ ...base, hideWhenNothingDue: false }), false);
  });

  it("never hides while Upcoming Reminder is off", () => {
    assert.strictEqual(shouldHideMenuBar({ ...base, nextReminderEnabled: false }), false);
  });

  it("stays visible while loading or when no list is selected", () => {
    assert.strictEqual(shouldHideMenuBar({ ...base, isLoading: true }), false);
    assert.strictEqual(shouldHideMenuBar({ ...base, lists: [] }), false);
    assert.strictEqual(shouldHideMenuBar({ ...base, lists: ["work"] }), true);
  });
});
