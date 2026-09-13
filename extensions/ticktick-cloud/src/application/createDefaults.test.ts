import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "../domain/errors";
import type { CreateTaskInput } from "../domain/task";
import {
  applyDefaultDate,
  resolveCreateDefaults,
  resolveCreateFormDefaults,
  resolveQuickAddDefaults,
  type CreateDefaultsDependencies,
} from "./createDefaults";

const DENVER = "America/Denver";

function dependencies(overrides: Partial<CreateDefaultsDependencies> = {}): CreateDefaultsDependencies {
  return {
    now: new Date("2026-08-14T16:23:45.678Z"),
    uiTimeZone: DENVER,
    readSelectedText: vi.fn().mockResolvedValue("selected"),
    readClipboardText: vi.fn().mockResolvedValue("clipboard"),
    ...overrides,
  };
}

async function captureRejection(operation: Promise<unknown>): Promise<unknown> {
  try {
    await operation;
    throw new Error("Expected the operation to reject.");
  } catch (error) {
    return error;
  }
}

function captureThrow(operation: () => unknown): unknown {
  try {
    operation();
    throw new Error("Expected the operation to throw.");
  } catch (error) {
    return error;
  }
}

describe("resolveCreateDefaults", () => {
  it("returns a frozen empty result for explicit none preferences without reading private text", async () => {
    const readSelectedText = vi.fn().mockResolvedValue("private selection");
    const readClipboardText = vi.fn().mockResolvedValue("private clipboard");
    const now = new Date("2026-08-14T16:23:45.678Z");
    const preferences = Object.freeze({ defaultTitle: "none", defaultDate: "none" });

    const result = await resolveCreateDefaults(
      preferences,
      dependencies({ now, uiTimeZone: "not/a-zone", readSelectedText, readClipboardText })
    );

    expect(result).toEqual({});
    expect(Object.isFrozen(result)).toBe(true);
    expect(readSelectedText).not.toHaveBeenCalled();
    expect(readClipboardText).not.toHaveBeenCalled();
    expect(now.toISOString()).toBe("2026-08-14T16:23:45.678Z");
    expect(preferences).toEqual({ defaultTitle: "none", defaultDate: "none" });
  });

  it("preserves selected text exactly and reads only selection exactly once", async () => {
    const title = "  Keep  spacing & emoji 👍  ";
    const readSelectedText = vi.fn().mockResolvedValue(title);
    const readClipboardText = vi.fn().mockResolvedValue("private clipboard");

    const result = await resolveCreateDefaults(
      { defaultTitle: "selection", defaultDate: "none" },
      dependencies({ readSelectedText, readClipboardText })
    );

    expect(result).toEqual({ defaultTitle: title });
    expect(readSelectedText).toHaveBeenCalledTimes(1);
    expect(readClipboardText).not.toHaveBeenCalled();
  });

  it("preserves clipboard text exactly and reads only clipboard exactly once", async () => {
    const title = "  Clipboard task 📝  ";
    const readSelectedText = vi.fn().mockResolvedValue("private selection");
    const readClipboardText = vi.fn().mockResolvedValue(title);

    const result = await resolveCreateDefaults(
      { defaultTitle: "clipboard", defaultDate: "none" },
      dependencies({ readSelectedText, readClipboardText })
    );

    expect(result).toEqual({ defaultTitle: title });
    expect(readClipboardText).toHaveBeenCalledTimes(1);
    expect(readSelectedText).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 0, false, {}, [], new String("do not coerce")])(
    "rejects a non-primitive-string selected value without coercing it: %o",
    async (value) => {
      const readClipboardText = vi.fn().mockResolvedValue("private clipboard fallback");

      const result = await resolveCreateDefaults(
        { defaultTitle: "selection", defaultDate: "none" },
        dependencies({ readSelectedText: vi.fn().mockResolvedValue(value), readClipboardText })
      );

      expect(result).toEqual({});
      expect(readClipboardText).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["empty", ""],
    ["ASCII whitespace", " \t "],
    ["Unicode whitespace", "\u00a0"],
    ["line control", "private\nvalue"],
    ["C0 control", "private\u0000value"],
    ["C1 control", "private\u007fvalue"],
    ["format character", "private\u200bvalue"],
    ["lone high surrogate", "private\ud800value"],
    ["trailing lone high surrogate", "private\ud800"],
    ["lone low surrogate", "private\udc00value"],
  ])("rejects %s title content without exposing it", async (_label, value) => {
    const result = await resolveCreateDefaults(
      { defaultTitle: "clipboard", defaultDate: "none" },
      dependencies({ readClipboardText: vi.fn().mockResolvedValue(value) })
    );

    expect(result).toEqual({});
  });

  it("treats a selected-text rejection as best effort and never falls back to clipboard", async () => {
    const readClipboardText = vi.fn().mockResolvedValue("private clipboard fallback");

    const result = await resolveCreateDefaults(
      { defaultTitle: "selection", defaultDate: "none" },
      dependencies({
        readSelectedText: vi.fn().mockRejectedValue(new Error("private selection failure")),
        readClipboardText,
      })
    );

    expect(result).toEqual({});
    expect(readClipboardText).not.toHaveBeenCalled();
  });

  it("treats a hostile selected-text dependency getter as a best-effort source failure", async () => {
    let selectedGetterReads = 0;
    const deps = dependencies();
    Object.defineProperty(deps, "readSelectedText", {
      configurable: true,
      get() {
        selectedGetterReads += 1;
        throw new Error("private dependency getter");
      },
    });

    const result = await resolveCreateDefaults({ defaultTitle: "selection", defaultDate: "none" }, deps);

    expect(result).toEqual({});
    expect(selectedGetterReads).toBe(1);
  });

  it("snapshots each preference field exactly once", async () => {
    let titleReads = 0;
    let dateReads = 0;
    const preferences = {
      get defaultTitle() {
        titleReads += 1;
        return "selection";
      },
      get defaultDate() {
        dateReads += 1;
        return "tomorrow";
      },
    };

    const result = await resolveCreateDefaults(preferences, dependencies());

    expect(result).toEqual({
      defaultTitle: "selected",
      defaultDate: new Date("2026-08-15T15:00:00.000Z"),
    });
    expect(titleReads).toBe(1);
    expect(dateReads).toBe(1);
  });

  it("treats hostile preference getters independently as none after one attempted read each", async () => {
    const reads: PropertyKey[] = [];
    const preferences = new Proxy(
      {},
      {
        get(_target, property) {
          reads.push(property);
          throw new Error(`private ${String(property)}`);
        },
      }
    );
    const readSelectedText = vi.fn().mockResolvedValue("private selection");
    const readClipboardText = vi.fn().mockResolvedValue("private clipboard");

    const result = await resolveCreateDefaults(preferences, dependencies({ readSelectedText, readClipboardText }));

    expect(result).toEqual({});
    expect(reads).toEqual(["defaultTitle", "defaultDate"]);
    expect(readSelectedText).not.toHaveBeenCalled();
    expect(readClipboardText).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 42, "selection", {}, { defaultTitle: "future-source", defaultDate: "future-date" }])(
    "fails closed for an unknown preference snapshot: %o",
    async (preferences) => {
      const readSelectedText = vi.fn().mockResolvedValue("private selection");
      const readClipboardText = vi.fn().mockResolvedValue("private clipboard");

      const result = await resolveCreateDefaults(preferences, dependencies({ readSelectedText, readClipboardText }));

      expect(result).toEqual({});
      expect(readSelectedText).not.toHaveBeenCalled();
      expect(readClipboardText).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["today", "2026-08-14T17:00:00.000Z"],
    ["tomorrow", "2026-08-15T15:00:00.000Z"],
    ["dayAfterTomorrow", "2026-08-16T15:00:00.000Z"],
    ["nextWeek", "2026-08-21T15:00:00.000Z"],
  ])("resolves %s in the injected Denver timezone", async (defaultDate, expectedIso) => {
    const now = new Date("2026-08-14T16:23:45.678Z");

    const result = await resolveCreateDefaults({ defaultTitle: "none", defaultDate }, dependencies({ now }));

    expect(result.defaultDate?.toISOString()).toBe(expectedIso);
    expect(result.defaultDate).not.toBe(now);
    expect(Object.isFrozen(result.defaultDate)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(now.toISOString()).toBe("2026-08-14T16:23:45.678Z");
  });

  it("uses the next whole local hour strictly after an exact-hour instant", async () => {
    const result = await resolveCreateDefaults(
      { defaultTitle: "none", defaultDate: "today" },
      dependencies({ now: new Date("2026-08-14T16:00:00.000Z") })
    );

    expect(result.defaultDate?.toISOString()).toBe("2026-08-14T17:00:00.000Z");
  });

  it("skips Denver's nonexistent spring-forward hour for today's next boundary", async () => {
    const result = await resolveCreateDefaults(
      { defaultTitle: "none", defaultDate: "today" },
      dependencies({ now: new Date("2026-03-08T08:30:00.000Z") })
    );

    expect(result.defaultDate?.toISOString()).toBe("2026-03-08T09:00:00.000Z");
  });

  it("uses Denver's repeated fall-back hour when it is the next valid local boundary", async () => {
    const result = await resolveCreateDefaults(
      { defaultTitle: "none", defaultDate: "today" },
      dependencies({ now: new Date("2026-11-01T07:30:00.000Z") })
    );

    expect(result.defaultDate?.toISOString()).toBe("2026-11-01T08:00:00.000Z");
  });

  it("finds the next future whole local hour across Lord Howe's half-hour fall-back fold", async () => {
    const now = new Date("2026-04-04T14:15:00.000Z");

    const result = await resolveCreateDefaults(
      { defaultTitle: "none", defaultDate: "today" },
      dependencies({ now, uiTimeZone: "Australia/Lord_Howe" })
    );

    expect(result.defaultDate?.toISOString()).toBe("2026-04-04T15:30:00.000Z");
    expect(result.defaultDate!.getTime()).toBeGreaterThan(now.getTime());
  });

  it("finds a round-tripping whole local hour across Lord Howe's half-hour spring gap", async () => {
    const now = new Date("2026-10-03T14:45:00.000Z");

    const result = await resolveCreateDefaults(
      { defaultTitle: "none", defaultDate: "today" },
      dependencies({ now, uiTimeZone: "Australia/Lord_Howe" })
    );

    expect(result.defaultDate?.toISOString()).toBe("2026-10-03T16:00:00.000Z");
    expect(result.defaultDate!.getTime()).toBeGreaterThan(now.getTime());
  });

  it.each([
    ["spring forward", "2026-03-07T17:30:00.000Z", "2026-03-08T15:00:00.000Z"],
    ["fall back", "2026-10-31T16:30:00.000Z", "2026-11-01T16:00:00.000Z"],
  ])("keeps tomorrow at local 09:00 across Denver %s", async (_label, nowIso, expectedIso) => {
    const result = await resolveCreateDefaults(
      { defaultTitle: "none", defaultDate: "tomorrow" },
      dependencies({ now: new Date(nowIso) })
    );

    expect(result.defaultDate?.toISOString()).toBe(expectedIso);
  });

  it.each([
    ["Asia/Tokyo", "2026-08-14T16:23:45.678Z", "2026-08-16T00:00:00.000Z"],
    ["UTC", "2026-08-14T16:23:45.678Z", "2026-08-15T09:00:00.000Z"],
    ["Pacific/Honolulu", "2026-08-14T16:23:45.678Z", "2026-08-15T19:00:00.000Z"],
  ])("uses injected zone %s rather than the process timezone", async (uiTimeZone, nowIso, expectedIso) => {
    const result = await resolveCreateDefaults(
      { defaultTitle: "none", defaultDate: "tomorrow" },
      dependencies({ now: new Date(nowIso), uiTimeZone })
    );

    expect(result.defaultDate?.toISOString()).toBe(expectedIso);
  });

  it.each([
    ["invalid Date", new Date(Number.NaN), DENVER],
    ["non-Date", "2026-08-14T16:23:45.678Z", DENVER],
    ["invalid zone", new Date("2026-08-14T16:23:45.678Z"), "private/not-a-zone"],
    ["blank zone", new Date("2026-08-14T16:23:45.678Z"), " "],
    ["prototype-key zone", new Date("2026-08-14T16:23:45.678Z"), "__proto__"],
    ["constructor-key zone", new Date("2026-08-14T16:23:45.678Z"), "constructor"],
  ])("throws one fixed cause-free ValidationError for %s when a date is requested", async (_label, now, uiTimeZone) => {
    const readSelectedText = vi.fn().mockResolvedValue("private selection");
    const error = await captureRejection(
      resolveCreateDefaults(
        { defaultTitle: "selection", defaultDate: "today" },
        dependencies({ now: now as Date, uiTimeZone, readSelectedText })
      )
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({
      name: "ValidationError",
      message: "Task creation date defaults are unavailable.",
      code: "validation",
      retryable: false,
    });
    expect((error as Error & { cause?: unknown }).cause).toBeUndefined();
    expect(String(error)).not.toContain("private/not-a-zone");
    expect(readSelectedText).not.toHaveBeenCalled();
  });

  it("turns hostile now and timezone getters into the same fixed cause-free ValidationError", async () => {
    for (const hostileProperty of ["now", "uiTimeZone"] as const) {
      const deps = dependencies();
      Object.defineProperty(deps, hostileProperty, {
        configurable: true,
        get() {
          throw new Error(`private ${hostileProperty}`);
        },
      });

      const error = await captureRejection(resolveCreateDefaults({ defaultTitle: "none", defaultDate: "today" }, deps));

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({
        message: "Task creation date defaults are unavailable.",
      });
      expect((error as Error & { cause?: unknown }).cause).toBeUndefined();
      expect(String(error)).not.toContain("private");
    }
  });

  it("turns a revoked Date proxy into the fixed cause-free ValidationError", async () => {
    const { proxy: now, revoke } = Proxy.revocable(new Date("2026-08-14T16:23:45.678Z"), {});
    revoke();

    const error = await captureRejection(
      resolveCreateDefaults({ defaultTitle: "none", defaultDate: "today" }, dependencies({ now: now as Date }))
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).toMatchObject({ message: "Task creation date defaults are unavailable." });
    expect((error as Error & { cause?: unknown }).cause).toBeUndefined();
  });

  it("does not inspect invalid date dependencies when the date preference is none", async () => {
    const deps = dependencies({ readSelectedText: vi.fn().mockResolvedValue("selected title") });
    Object.defineProperty(deps, "now", {
      configurable: true,
      get() {
        throw new Error("private now");
      },
    });
    Object.defineProperty(deps, "uiTimeZone", {
      configurable: true,
      get() {
        throw new Error("private zone");
      },
    });

    const result = await resolveCreateDefaults({ defaultTitle: "selection", defaultDate: "none" }, deps);

    expect(result).toEqual({ defaultTitle: "selected title" });
  });

  it("does not mutate a mutable preference object or its injected Date", async () => {
    const preferences = { defaultTitle: "none", defaultDate: "nextWeek", extra: { untouched: true } };
    const now = new Date("2026-08-14T16:23:45.678Z");

    await resolveCreateDefaults(preferences, dependencies({ now }));

    expect(preferences).toEqual({ defaultTitle: "none", defaultDate: "nextWeek", extra: { untouched: true } });
    expect(Object.isFrozen(preferences)).toBe(false);
    expect(Object.isFrozen(preferences.extra)).toBe(false);
    expect(now.toISOString()).toBe("2026-08-14T16:23:45.678Z");
    expect(Object.isFrozen(now)).toBe(false);
  });

  it("stays application-layer neutral and avoids ambient time, I/O, logging, and timers", async () => {
    const source = await readFile(join(process.cwd(), "src", "application", "createDefaults.ts"), "utf8");

    expect(source).not.toMatch(/@raycast|LocalStorage|Clipboard\.|getSelectedText|\.\.\/service|\.\.\/infrastructure/);
    expect(source).not.toMatch(/Date\.now\s*\(|new Date\s*\(\s*\)|moment\s*\(\s*\)/);
    expect(source).not.toMatch(/fetch\s*\(|console\.|setTimeout|setInterval/);
    expect(source).toContain("moment.tz");
  });
});

describe("resolveCreateFormDefaults", () => {
  it("always validates and supplies one UI timezone without reading ambient time or private text", async () => {
    const deps = dependencies();
    let nowReads = 0;
    let timeZoneReads = 0;
    Object.defineProperty(deps, "now", {
      configurable: true,
      get() {
        nowReads += 1;
        throw new Error("now is unnecessary without a date default");
      },
    });
    Object.defineProperty(deps, "uiTimeZone", {
      configurable: true,
      get() {
        timeZoneReads += 1;
        return DENVER;
      },
    });

    const result = await resolveCreateFormDefaults({ defaultTitle: "none", defaultDate: "none" }, deps);

    expect(result).toEqual({ uiTimeZone: DENVER });
    expect(Object.isFrozen(result)).toBe(true);
    expect(nowReads).toBe(0);
    expect(timeZoneReads).toBe(1);
    expect(deps.readSelectedText).not.toHaveBeenCalled();
    expect(deps.readClipboardText).not.toHaveBeenCalled();
  });

  it("rejects an invalid form timezone with the fixed cause-free date-default error before private title reads", async () => {
    const readSelectedText = vi.fn().mockResolvedValue("private selection");
    const failure = await captureRejection(
      resolveCreateFormDefaults(
        { defaultTitle: "selection", defaultDate: "none" },
        dependencies({ uiTimeZone: "private/not-a-zone", readSelectedText })
      )
    );

    expect(failure).toEqual(new ValidationError("Task creation date defaults are unavailable."));
    expect((failure as Error & { cause?: unknown }).cause).toBeUndefined();
    expect(String(failure)).not.toContain("private/not-a-zone");
    expect(readSelectedText).not.toHaveBeenCalled();
  });
});

describe("resolveQuickAddDefaults", () => {
  it("reads only defaultDate and snapshots now and timezone once when a date is requested", () => {
    let defaultTitleReads = 0;
    let defaultDateReads = 0;
    let nowReads = 0;
    let timeZoneReads = 0;
    const preferences = {
      get defaultTitle() {
        defaultTitleReads += 1;
        throw new Error("private default title must stay unread");
      },
      get defaultDate() {
        defaultDateReads += 1;
        return "tomorrow";
      },
    };
    const deps = dependencies();
    Object.defineProperty(deps, "now", {
      configurable: true,
      get() {
        nowReads += 1;
        return new Date("2026-08-14T16:23:45.678Z");
      },
    });
    Object.defineProperty(deps, "uiTimeZone", {
      configurable: true,
      get() {
        timeZoneReads += 1;
        return DENVER;
      },
    });
    Object.defineProperty(deps, "readSelectedText", {
      configurable: true,
      get() {
        throw new Error("selection source must stay unread");
      },
    });
    Object.defineProperty(deps, "readClipboardText", {
      configurable: true,
      get() {
        throw new Error("clipboard source must stay unread");
      },
    });

    const result = resolveQuickAddDefaults(preferences, deps);

    expect(result).toEqual({
      defaultDate: new Date("2026-08-15T15:00:00.000Z"),
      uiTimeZone: DENVER,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.defaultDate)).toBe(true);
    expect(defaultTitleReads).toBe(0);
    expect(defaultDateReads).toBe(1);
    expect(nowReads).toBe(1);
    expect(timeZoneReads).toBe(1);
  });

  it("returns a frozen empty result without reading title, private sources, now, or timezone when no date is requested", () => {
    let defaultTitleReads = 0;
    const preferences = {
      get defaultTitle() {
        defaultTitleReads += 1;
        throw new Error("private default title must stay unread");
      },
      defaultDate: "none",
    };
    const deps = dependencies();
    for (const property of ["now", "uiTimeZone", "readSelectedText", "readClipboardText"] as const) {
      Object.defineProperty(deps, property, {
        configurable: true,
        get() {
          throw new Error(`${property} must stay unread`);
        },
      });
    }

    const result = resolveQuickAddDefaults(preferences, deps);

    expect(result).toEqual({});
    expect(Object.isFrozen(result)).toBe(true);
    expect(defaultTitleReads).toBe(0);
  });
});

describe("applyDefaultDate", () => {
  it("adds one floating timed due-date tuple while preserving non-date fields and the mutable input", () => {
    const input: CreateTaskInput = {
      title: "Exact title",
      projectId: "project-work",
      description: "Exact description",
      priority: 5,
      tags: ["Exact Tag"],
    };
    const before = structuredClone(input);

    const result = applyDefaultDate(input, {
      defaultDate: new Date("2026-08-15T15:00:00.000Z"),
      uiTimeZone: DENVER,
    });

    expect(result).toEqual({
      ...before,
      dueDate: "2026-08-15T09:00:00.000-06:00",
      isAllDay: false,
      isFloating: true,
      timeZone: DENVER,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(input).toEqual(before);
    expect(Object.isFrozen(input)).toBe(false);
  });

  it("keeps an explicit non-empty due date and every supplied date-semantics field authoritative", () => {
    const input: CreateTaskInput = {
      title: "Explicit date",
      dueDate: "2026-09-01T12:30:00.000Z",
      isAllDay: true,
      isFloating: false,
      timeZone: "UTC",
    };

    const result = applyDefaultDate(input, {
      defaultDate: new Date("2026-08-15T15:00:00.000Z"),
      uiTimeZone: DENVER,
    });

    expect(result).toEqual(input);
    expect(result).not.toBe(input);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(input)).toBe(false);
  });

  it("fills only undefined date semantics and never reinterprets an existing start date", () => {
    const input: CreateTaskInput = {
      title: "Preserve date semantics",
      startDate: "2026-08-15T01:30:00.000Z",
      dueDate: "",
      isAllDay: true,
      isFloating: false,
      timeZone: "UTC",
    };

    const result = applyDefaultDate(input, {
      defaultDate: new Date("2026-08-15T15:00:00.000Z"),
      uiTimeZone: DENVER,
    });

    expect(result).toEqual({
      ...input,
      dueDate: "2026-08-15T09:00:00.000-06:00",
    });
    expect(result.startDate).toBe(input.startDate);
    expect(result.isAllDay).toBe(true);
    expect(result.isFloating).toBe(false);
    expect(result.timeZone).toBe("UTC");
    expect(input.dueDate).toBe("");
  });

  it("deeply snapshots and freezes supported nested task fields without freezing or aliasing caller data", () => {
    const tags = ["Exact Tag"];
    const items = [
      {
        id: "item-1",
        title: "Exact checklist item",
        status: "open" as const,
        sortOrder: 0,
      },
    ];
    const input: CreateTaskInput = { title: "Nested input", tags, items };

    const result = applyDefaultDate(input, {});

    expect(result.tags).toEqual(["Exact Tag"]);
    expect(result.tags).not.toBe(tags);
    expect(Object.isFrozen(result.tags)).toBe(true);
    expect(result.items).toEqual(items);
    expect(result.items).not.toBe(items);
    expect(result.items?.[0]).not.toBe(items[0]);
    expect(Object.isFrozen(result.items)).toBe(true);
    expect(Object.isFrozen(result.items?.[0])).toBe(true);
    expect(Object.isFrozen(tags)).toBe(false);
    expect(Object.isFrozen(items)).toBe(false);
    expect(Object.isFrozen(items[0])).toBe(false);

    tags.push("Caller mutation");
    items[0].title = "Caller mutation";
    expect(result.tags).toEqual(["Exact Tag"]);
    expect(result.items?.[0]?.title).toBe("Exact checklist item");
  });

  it("does not add date or timezone fields when no default date exists", () => {
    const input: CreateTaskInput = { title: "No date", projectId: "inbox" };

    const result = applyDefaultDate(input, {});

    expect(result).toEqual(input);
    expect(result).not.toBe(input);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result).not.toHaveProperty("dueDate");
    expect(result).not.toHaveProperty("timeZone");
  });

  it("rejects a default date without its validated timezone without mutating input", () => {
    const input: CreateTaskInput = { title: "Invalid defaults" };

    expect(() => applyDefaultDate(input, { defaultDate: new Date("2026-08-15T15:00:00.000Z") })).toThrowError(
      new ValidationError("Task creation date defaults are unavailable.")
    );
    expect(input).toEqual({ title: "Invalid defaults" });
  });

  it.each([new Date(-8_640_000_000_000_000), new Date(8_640_000_000_000_000)])(
    "rejects an extreme finite Date that cannot become canonical ISO (%s)",
    (defaultDate) => {
      const input: CreateTaskInput = { title: "Extreme date" };
      const failure = captureThrow(() => applyDefaultDate(input, { defaultDate, uiTimeZone: DENVER }));

      expect(failure).toEqual(new ValidationError("Task creation date defaults are unavailable."));
      expect((failure as Error & { cause?: unknown }).cause).toBeUndefined();
      expect(input).toEqual({ title: "Extreme date" });
    }
  );
});
