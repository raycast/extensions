import { afterEach } from "vitest";
import { resetPreferences, setPreferences } from "../../test/raycast-api-stub";
import {
  NEW_LABEL_PREFIX,
  REPEAT_NONE,
  REPEAT_UNITS,
  buildMagicPreview,
  buildRepeatPayload,
  computeRepeat,
  formatRepeat,
  formatRepeatParts,
  resolveLabels,
  resolveProject,
  secondsToRepeat,
  splitLabelValues,
} from "./magic";

const projects = [
  {
    id: 1,
    title: "Inbox",
    description: "",
    is_archived: false,
    parent_project_id: null,
    hex_color: "",
    identifier: "INB",
  },
  {
    id: 2,
    title: "Work Stuff",
    description: "",
    is_archived: false,
    parent_project_id: null,
    hex_color: "",
    identifier: "WRK",
  },
];

const labels = [
  { id: 10, title: "shopping", hex_color: "" },
  { id: 11, title: "Urgent", hex_color: "" },
];

describe("computeRepeat", () => {
  it("returns undefined when there is no repeat", () => {
    expect(computeRepeat(null)).toBeUndefined();
  });

  const cases: Array<[string, number, number, number | undefined]> = [
    ["hours", 1, 3600, undefined],
    ["hours", 5, 18000, undefined],
    ["days", 1, 86400, undefined],
    ["days", 2, 172800, undefined],
    ["weeks", 1, 604800, undefined],
    ["weeks", 3, 1814400, undefined],
    ["months", 1, 2592000, 1],
    ["months", 2, 5184000, undefined],
    ["months", 6, 15552000, undefined],
    ["years", 1, 31536000, undefined],
    ["years", 2, 63072000, undefined],
  ];

  cases.forEach(([type, amount, seconds, mode]) => {
    it(`converts ${amount} ${type} to ${seconds}s`, () => {
      const result = computeRepeat({ type, amount } as never);
      expect(result?.repeat_after).toBe(seconds);
      expect(result?.repeat_mode).toBe(mode);
    });
  });

  it("only sets repeat_mode for a single month", () => {
    expect(
      computeRepeat({ type: "months", amount: 1 } as never)?.repeat_mode,
    ).toBe(1);
    expect(
      computeRepeat({ type: "months", amount: 2 } as never)?.repeat_mode,
    ).toBeUndefined();
  });

  it("ignores unsupported units", () => {
    expect(
      computeRepeat({ type: "seconds", amount: 30 } as never),
    ).toBeUndefined();
    expect(
      computeRepeat({ type: "minutes", amount: 5 } as never),
    ).toBeUndefined();
  });

  it("rejects a non-positive interval", () => {
    expect(computeRepeat({ type: "days", amount: 0 } as never)).toBeUndefined();
  });
});

describe("buildRepeatPayload", () => {
  it("sets repeat_mode for a manually chosen single month", () => {
    expect(buildRepeatPayload("months", 1)).toEqual({
      repeat_after: 2592000,
      repeat_mode: 1,
    });
  });

  it("omits repeat_mode for other intervals", () => {
    expect(buildRepeatPayload("months", 3)).toEqual({ repeat_after: 7776000 });
    expect(buildRepeatPayload("weeks", 1)).toEqual({ repeat_after: 604800 });
  });

  it("rejects an unknown unit", () => {
    expect(buildRepeatPayload("fortnights", 1)).toBeUndefined();
  });

  it("rejects a zero or negative amount", () => {
    expect(buildRepeatPayload("days", 0)).toBeUndefined();
    expect(buildRepeatPayload("days", -1)).toBeUndefined();
  });
});

describe("secondsToRepeat", () => {
  it("treats a non-positive interval as no repeat", () => {
    expect(secondsToRepeat(0)).toEqual({ unit: REPEAT_NONE, amount: 1 });
    expect(secondsToRepeat(-5)).toEqual({ unit: REPEAT_NONE, amount: 1 });
  });

  it("prefers the largest unit that divides evenly", () => {
    expect(secondsToRepeat(1209600)).toEqual({ unit: "weeks", amount: 2 });
    expect(secondsToRepeat(2592000)).toEqual({ unit: "months", amount: 1 });
    expect(secondsToRepeat(31536000)).toEqual({ unit: "years", amount: 1 });
    expect(secondsToRepeat(172800)).toEqual({ unit: "days", amount: 2 });
    expect(secondsToRepeat(3600)).toEqual({ unit: "hours", amount: 1 });
  });

  it("falls back to hours when nothing divides cleanly", () => {
    expect(secondsToRepeat(5400).unit).toBe("hours");
  });

  it("round-trips every unit through buildRepeatPayload", () => {
    REPEAT_UNITS.forEach((unit) => {
      [1, 2, 5].forEach((amount) => {
        const payload = buildRepeatPayload(unit, amount);
        expect(payload).toBeDefined();
        const restored = secondsToRepeat(payload!.repeat_after);
        // The restored value must describe the same duration, even if it
        // normalises to a larger unit (e.g. 12 months -> 1 year).
        const reencoded = buildRepeatPayload(
          restored.unit as string,
          restored.amount,
        );
        expect(reencoded?.repeat_after).toBe(payload!.repeat_after);
      });
    });
  });
});

describe("formatRepeatParts", () => {
  it("formats a singular interval", () => {
    expect(formatRepeatParts("months", 1)).toBe("every month");
  });

  it("formats a plural interval", () => {
    expect(formatRepeatParts("days", 4)).toBe("every 4 days");
  });

  it("returns null for an unknown unit", () => {
    expect(formatRepeatParts("fortnights", 1)).toBeNull();
  });
});

describe("formatRepeat", () => {
  it("returns null without a repeat", () => {
    expect(formatRepeat(null)).toBeNull();
  });

  it("uses the singular form for one", () => {
    expect(formatRepeat({ type: "weeks", amount: 1 } as never)).toBe(
      "every week",
    );
  });

  it("uses the plural form above one", () => {
    expect(formatRepeat({ type: "weeks", amount: 3 } as never)).toBe(
      "every 3 weeks",
    );
  });
});

describe("resolveProject", () => {
  it("returns null without a parsed project", () => {
    expect(resolveProject(null, projects)).toBeNull();
  });

  it("matches an exact title", () => {
    expect(resolveProject("Inbox", projects)?.id).toBe(1);
  });

  it("matches a title case-insensitively", () => {
    expect(resolveProject("work stuff", projects)?.id).toBe(2);
  });

  it("falls back to the identifier", () => {
    expect(resolveProject("WRK", projects)?.id).toBe(2);
  });

  it("prefers a title over an identifier", () => {
    const shadowed = [
      ...projects,
      {
        id: 3,
        title: "WRK",
        description: "",
        is_archived: false,
        parent_project_id: null,
        hex_color: "",
        identifier: "OTHER",
      },
    ];
    expect(resolveProject("WRK", shadowed)?.id).toBe(3);
  });

  it("returns null when nothing matches", () => {
    expect(resolveProject("Nope", projects)).toBeNull();
  });
});

describe("resolveLabels", () => {
  it("maps an existing label to its id", () => {
    const result = resolveLabels(["shopping"], labels);
    expect(result.values).toEqual(["10"]);
    expect(result.missingTitles).toEqual([]);
  });

  it("matches case-insensitively", () => {
    expect(resolveLabels(["URGENT"], labels).values).toEqual(["11"]);
  });

  it("flags an unknown label as new", () => {
    const result = resolveLabels(["brandnew"], labels);
    expect(result.values).toEqual([`${NEW_LABEL_PREFIX}brandnew`]);
    expect(result.missingTitles).toEqual(["brandnew"]);
  });

  it("handles a mix of existing and new labels", () => {
    const result = resolveLabels(["shopping", "brandnew"], labels);
    expect(result.values).toEqual(["10", `${NEW_LABEL_PREFIX}brandnew`]);
    expect(result.missingTitles).toEqual(["brandnew"]);
  });
});

describe("splitLabelValues", () => {
  it("splits ids from new titles", () => {
    const result = splitLabelValues(["10", `${NEW_LABEL_PREFIX}fresh`, "11"]);
    expect(result.existingIds).toEqual([10, 11]);
    expect(result.newTitles).toEqual(["fresh"]);
  });

  it("drops non-numeric junk", () => {
    expect(splitLabelValues(["abc"]).existingIds).toEqual([]);
  });

  it("handles an empty list", () => {
    expect(splitLabelValues([])).toEqual({ existingIds: [], newTitles: [] });
  });

  it("preserves a title containing a colon", () => {
    expect(splitLabelValues([`${NEW_LABEL_PREFIX}a:b`]).newTitles).toEqual([
      "a:b",
    ]);
  });
});

describe("buildMagicPreview", () => {
  it("strips tokens from the title", () => {
    const preview = buildMagicPreview(
      "Buy milk *shopping +Inbox !3",
      projects,
      labels,
    );
    expect(preview.title).toBe("Buy milk");
    expect(preview.isEmpty).toBe(false);
  });

  it("resolves the project", () => {
    const preview = buildMagicPreview("Task +Inbox", projects, labels);
    expect(preview.project?.id).toBe(1);
    expect(preview.unmatchedProject).toBeNull();
  });

  it("reports an unmatched project without throwing", () => {
    const preview = buildMagicPreview("Task +Ghost", projects, labels);
    expect(preview.project).toBeNull();
    expect(preview.unmatchedProject).toBe("Ghost");
  });

  it("resolves existing and new labels", () => {
    const preview = buildMagicPreview(
      "Task *shopping *fresh",
      projects,
      labels,
    );
    expect(preview.labelValues).toEqual(["10", `${NEW_LABEL_PREFIX}fresh`]);
    expect(preview.missingLabelTitles).toEqual(["fresh"]);
  });

  it("exposes a priority label", () => {
    expect(buildMagicPreview("Task !4", projects, labels).priorityLabel).toBe(
      "Urgent",
    );
    expect(
      buildMagicPreview("Task", projects, labels).priorityLabel,
    ).toBeNull();
  });

  it("exposes the repeat payload and summary", () => {
    const preview = buildMagicPreview("Task monthly", projects, labels);
    expect(preview.repeat).toEqual({ repeat_after: 2592000, repeat_mode: 1 });
    expect(preview.repeatText).toBe("every month");
  });

  it("collects assignee names", () => {
    const preview = buildMagicPreview("Task @alice @bob", projects, labels);
    expect(preview.assigneeNames).toEqual(["alice", "bob"]);
  });

  it("strips assignee tokens from the title", () => {
    const preview = buildMagicPreview("Task @alice @bob", projects, labels);
    expect(preview.title).toBe("Task");
  });

  it("strips an assignee token even when the user may not exist", () => {
    // Stripping unconditionally keeps the title stable between the preview and
    // the confirmation step.
    const preview = buildMagicPreview("Buy milk @nobody", projects, labels);
    expect(preview.title).toBe("Buy milk");
    expect(preview.assigneeNames).toEqual(["nobody"]);
  });

  it("strips a quoted assignee name", () => {
    const preview = buildMagicPreview(
      "Task @'Jane Doe' more",
      projects,
      labels,
    );
    expect(preview.assigneeNames).toEqual(["Jane Doe"]);
    expect(preview.title).toBe("Task more");
  });

  it("keeps an email-style assignee out of the title", () => {
    const preview = buildMagicPreview(
      "Task @user@example.com",
      projects,
      labels,
    );
    expect(preview.assigneeNames).toEqual(["user@example.com"]);
    expect(preview.title).toBe("Task");
  });

  it("flags input that is only tokens as empty", () => {
    expect(buildMagicPreview("*label", projects, labels).isEmpty).toBe(true);
  });

  it("keeps the raw input for display", () => {
    const input = "Task tomorrow *x";
    expect(buildMagicPreview(input, projects, labels).input).toBe(input);
  });

  it("parses a due date", () => {
    expect(
      buildMagicPreview("Task tomorrow", projects, labels).parsed.date,
    ).not.toBeNull();
  });

  describe("reminder fields", () => {
    afterEach(() => {
      resetPreferences();
    });

    it("reports no reminder by default", () => {
      const preview = buildMagicPreview("Task tomorrow", projects, labels);
      expect(preview.reminderLabel).toBeNull();
      expect(preview.reminderNeedsDueDate).toBe(false);
    });

    it("exposes the configured reminder label", () => {
      setPreferences({ defaultReminder: "1d-before" });
      const preview = buildMagicPreview("Task tomorrow", projects, labels);
      expect(preview.reminderLabel).toBe("1 day before");
      expect(preview.reminderNeedsDueDate).toBe(false);
    });

    it("flags a missing due date when a reminder is configured", () => {
      setPreferences({ defaultReminder: "1d-before" });
      const preview = buildMagicPreview("Task with no date", projects, labels);
      expect(preview.reminderLabel).toBe("1 day before");
      expect(preview.reminderNeedsDueDate).toBe(true);
    });

    it("does not flag a missing due date when no reminder is configured", () => {
      const preview = buildMagicPreview("Task with no date", projects, labels);
      expect(preview.reminderNeedsDueDate).toBe(false);
    });
  });
});
