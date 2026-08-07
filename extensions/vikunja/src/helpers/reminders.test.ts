import {
  REMINDER_PRESETS,
  buildDefaultReminders,
  formatReminderPreset,
  isReminderEnabled,
} from "./reminders";

const EPOCH = new Date(0).toISOString();

describe("REMINDER_PRESETS", () => {
  it("offers no reminder plus the six web client presets", () => {
    expect(REMINDER_PRESETS).toHaveLength(7);
    expect(REMINDER_PRESETS[0].value).toBe("none");
  });

  it("matches the upstream offsets", () => {
    const bySlug = Object.fromEntries(
      REMINDER_PRESETS.map((p) => [p.value, p.seconds]),
    );
    expect(bySlug["none"]).toBeNull();
    expect(bySlug["on-due"]).toBe(0);
    expect(bySlug["2h-before"]).toBe(-7200);
    expect(bySlug["1d-before"]).toBe(-86400);
    expect(bySlug["3d-before"]).toBe(-259200);
    expect(bySlug["1w-before"]).toBe(-604800);
    expect(bySlug["30d-before"]).toBe(-2592000);
  });

  it("uses non-positive offsets so reminders never land after the due date", () => {
    REMINDER_PRESETS.forEach((p) => {
      if (p.seconds !== null) expect(p.seconds).toBeLessThanOrEqual(0);
    });
  });
});

describe("isReminderEnabled", () => {
  it("is false for none, undefined and unknown values", () => {
    expect(isReminderEnabled("none")).toBe(false);
    expect(isReminderEnabled(undefined)).toBe(false);
    expect(isReminderEnabled("bogus")).toBe(false);
  });

  it("is true for a real preset, including the zero offset", () => {
    expect(isReminderEnabled("on-due")).toBe(true);
    expect(isReminderEnabled("1d-before")).toBe(true);
  });
});

describe("formatReminderPreset", () => {
  it("returns null when no reminder would be added", () => {
    expect(formatReminderPreset("none")).toBeNull();
    expect(formatReminderPreset(undefined)).toBeNull();
    expect(formatReminderPreset("bogus")).toBeNull();
  });

  it("returns the preset label", () => {
    expect(formatReminderPreset("2h-before")).toBe("2 hours before");
    expect(formatReminderPreset("on-due")).toBe("At the due date");
  });
});

describe("buildDefaultReminders", () => {
  it("returns nothing when no preset is configured", () => {
    expect(buildDefaultReminders("none", true)).toEqual([]);
    expect(buildDefaultReminders(undefined, true)).toEqual([]);
  });

  it("returns nothing without a due date to anchor to", () => {
    expect(buildDefaultReminders("1d-before", false)).toEqual([]);
  });

  it("returns nothing for an unknown preset", () => {
    expect(buildDefaultReminders("bogus", true)).toEqual([]);
  });

  it("builds a single due-date-relative reminder", () => {
    expect(buildDefaultReminders("1d-before", true)).toEqual([
      {
        reminder: EPOCH,
        relative_period: -86400,
        relative_to: "due_date",
      },
    ]);
  });

  it("handles the zero offset preset", () => {
    const [reminder] = buildDefaultReminders("on-due", true);
    expect(reminder.relative_period).toBe(0);
    expect(reminder.relative_to).toBe("due_date");
  });

  it("always anchors to due_date", () => {
    REMINDER_PRESETS.filter((p) => p.seconds !== null).forEach((p) => {
      const [reminder] = buildDefaultReminders(p.value, true);
      expect(reminder.relative_to).toBe("due_date");
    });
  });

  it("sends the epoch placeholder that the web client uses", () => {
    // Relative reminders carry the Unix epoch rather than null; the server
    // ignores it because relative_to is set.
    const [reminder] = buildDefaultReminders("1w-before", true);
    expect(reminder.reminder).toBe("1970-01-01T00:00:00.000Z");
  });
});
