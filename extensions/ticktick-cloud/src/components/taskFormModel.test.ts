import moment from "moment-timezone";
import { describe, expect, expectTypeOf, it } from "vitest";

import { AmbiguousMutationError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { Task } from "../domain/task";
import {
  availableMoveProjects,
  buildCreateTaskFormValues,
  buildEditTaskFormBaseline,
  createSubmissionGate,
  mapCreateTaskInput,
  normalizeTags,
  planEditTaskSubmission,
  resolveDefaultProjectId,
  serializeTaskFormDate,
  type TaskFormValues,
  validateTaskFormValues,
} from "./taskFormModel";

const projects: Project[] = [
  { id: "inbox-id", name: "Inbox", kind: "inbox", closed: false },
  { id: "work-id", name: "Work", kind: "project", closed: false },
  { id: "closed-id", name: "Archived", kind: "project", closed: true },
];

function values(overrides: Partial<TaskFormValues> = {}): TaskFormValues {
  return {
    title: "Ship the extension",
    projectId: "inbox-id",
    description: "Keep the payload private",
    startDate: null,
    dueDate: null,
    isAllDay: false,
    priority: "0",
    tags: "",
    ...overrides,
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-id",
    projectId: "inbox-id",
    projectName: "Inbox",
    title: "Ship the extension",
    status: "open",
    priority: 3,
    tags: ["Raycast", "Windows"],
    kind: "TEXT",
    isAllDay: false,
    isFloating: true,
    timeZone: "America/Denver",
    content: "Original content",
    description: "Original description",
    startDate: "2026-11-01T01:30:00-06:00",
    dueDate: "2026-11-01T02:30:00-07:00",
    ...overrides,
  };
}

describe("TaskFormValues", () => {
  it("keeps the public form value contract exact", () => {
    expectTypeOf<TaskFormValues>().toEqualTypeOf<{
      title: string;
      projectId: string;
      description: string;
      startDate: Date | null;
      dueDate: Date | null;
      isAllDay: boolean;
      priority: "0" | "1" | "3" | "5";
      tags: string;
    }>();
  });
});

describe("project defaults and validation", () => {
  it("uses a remembered project only while it remains a real open project", () => {
    expect(resolveDefaultProjectId(projects, "work-id")).toBe("work-id");
    expect(resolveDefaultProjectId(projects, "closed-id")).toBe("inbox-id");
    expect(resolveDefaultProjectId(projects, "missing-id")).toBe("inbox-id");
  });

  it("falls back only to the authoritative open Inbox, never the first project or an Inbox name", () => {
    const noInbox: Project[] = [
      { id: "first-id", name: "First", kind: "project", closed: false },
      { id: "named-inbox", name: "Inbox", kind: "project", closed: false },
    ];

    expect(resolveDefaultProjectId(noInbox, "missing-id")).toBeUndefined();
    expect(
      resolveDefaultProjectId([{ id: "closed-inbox", name: "Inbox", kind: "inbox", closed: true }])
    ).toBeUndefined();
  });

  it("rejects whitespace titles and missing or closed project IDs", () => {
    expect(
      validateTaskFormValues(values({ title: " \t ", projectId: "closed-id" }), {
        projects,
        isFloating: false,
        timeZone: "America/Denver",
        uiTimeZone: "America/Denver",
      })
    ).toEqual({ title: "Title is required", projectId: "Choose an available list" });

    expect(
      validateTaskFormValues(values({ projectId: "missing-id" }), {
        projects,
        isFloating: false,
        timeZone: "America/Denver",
        uiTimeZone: "America/Denver",
      })
    ).toEqual({ projectId: "Choose an available list" });
  });

  it("rejects an invalid individual date instead of deferring the failure to mapping", () => {
    expect(
      validateTaskFormValues(values({ startDate: new Date(Number.NaN) }), {
        projects,
        isFloating: false,
        timeZone: "America/Denver",
        uiTimeZone: "America/Denver",
      })
    ).toEqual({ dateInterval: "Enter a valid date interval" });
  });
});

describe("date semantics", () => {
  const denver = "America/Denver";
  const fallBackStart = new Date("2026-11-01T07:30:00.000Z"); // 01:30 MDT
  const fallBackDue = new Date("2026-11-01T08:15:00.000Z"); // 01:15 MST

  it("compares timed values by actual instant across the Denver DST fallback", () => {
    expect(
      validateTaskFormValues(values({ startDate: fallBackStart, dueDate: fallBackDue }), {
        projects,
        isFloating: false,
        timeZone: denver,
        uiTimeZone: denver,
      })
    ).toEqual({});
  });

  it("compares floating values by wall clock across the Denver DST fallback", () => {
    expect(
      validateTaskFormValues(values({ startDate: fallBackStart, dueDate: fallBackDue }), {
        projects,
        isFloating: true,
        timeZone: denver,
        uiTimeZone: denver,
      })
    ).toEqual({ dateInterval: "Due date cannot be before start date" });
  });

  it("compares all-day values by calendar date and ignores their clock components", () => {
    const lateMarch8 = new Date("2026-03-09T05:30:00.000Z"); // Mar 8, 23:30 MDT
    const earlyMarch8 = new Date("2026-03-08T07:30:00.000Z"); // Mar 8, 00:30 MST

    expect(
      validateTaskFormValues(values({ startDate: lateMarch8, dueDate: earlyMarch8, isAllDay: true }), {
        projects,
        isFloating: false,
        timeZone: denver,
        uiTimeZone: denver,
      })
    ).toEqual({});
  });

  it("serializes timed instants, floating wall clocks, and all-day calendar starts distinctly", () => {
    expect(
      serializeTaskFormDate(fallBackStart, {
        isAllDay: false,
        isFloating: false,
        timeZone: denver,
        uiTimeZone: denver,
      })
    ).toBe("2026-11-01T07:30:00.000Z");
    expect(
      serializeTaskFormDate(fallBackStart, {
        isAllDay: false,
        isFloating: true,
        timeZone: denver,
        uiTimeZone: denver,
      })
    ).toBe("2026-11-01T01:30:00.000-06:00");
    expect(
      serializeTaskFormDate(new Date("2026-03-08T18:00:00.000Z"), {
        isAllDay: true,
        isFloating: false,
        timeZone: denver,
        uiTimeZone: denver,
      })
    ).toBe("2026-03-08T00:00:00.000-07:00");
  });
});

describe("mapping and submission planning", () => {
  it("builds create defaults without letting async project loading overwrite the supplied title or date", () => {
    const defaultDate = new Date("2026-08-15T15:00:00.000Z");

    expect(
      buildCreateTaskFormValues({
        projects,
        rememberedProjectId: "work-id",
        defaultTitle: "From Selection",
        defaultDate,
      })
    ).toEqual({
      title: "From Selection",
      projectId: "work-id",
      description: "",
      startDate: null,
      dueDate: defaultDate,
      isAllDay: false,
      priority: "0",
      tags: "",
    });
  });

  it("maps a create form to numeric priority, normalized tags, and explicit date semantics", () => {
    const input = mapCreateTaskInput(
      values({
        title: "  Ship it  ",
        description: "Details",
        startDate: new Date("2026-08-14T15:00:00.000Z"),
        dueDate: new Date("2026-08-14T16:00:00.000Z"),
        isAllDay: false,
        priority: "5",
        tags: " Raycast, raycast, Straße, STRASSE ",
      }),
      { isFloating: false, timeZone: "America/Denver", uiTimeZone: "America/Denver" }
    );

    expect(input).toEqual({
      title: "Ship it",
      projectId: "inbox-id",
      description: "Details",
      startDate: "2026-08-14T15:00:00.000Z",
      dueDate: "2026-08-14T16:00:00.000Z",
      isAllDay: false,
      isFloating: false,
      timeZone: "America/Denver",
      priority: 5,
      tags: ["Raycast", "Straße"],
    });
  });

  it("creates an edit baseline that preserves description/content and task date metadata", () => {
    const source = task();
    const baseline = buildEditTaskFormBaseline(source, "America/Denver");

    expect(baseline.values).toMatchObject({
      title: source.title,
      projectId: source.projectId,
      description: "Original description",
      isAllDay: false,
      priority: "3",
      tags: "Raycast, Windows",
    });
    expect(baseline.values.startDate?.toISOString()).toBe("2026-11-01T07:30:00.000Z");
    expect(baseline.values.dueDate?.toISOString()).toBe("2026-11-01T09:30:00.000Z");
    expect(baseline.dateSemantics).toEqual({
      isFloating: true,
      timeZone: "America/Denver",
      uiTimeZone: "America/Denver",
    });

    const contentOnly = buildEditTaskFormBaseline(
      task({ description: undefined, content: "Content fallback" }),
      "America/Denver"
    );
    expect(contentOnly.values.description).toBe("Content fallback");
  });

  it("omits every unchanged optional value so edit mode preserves the source task", () => {
    const source = task();
    const baseline = buildEditTaskFormBaseline(source, "America/Denver");

    expect(planEditTaskSubmission(source, baseline.values, "America/Denver")).toEqual({
      kind: "edit",
      sourceRef: { id: "task-id", projectId: "inbox-id" },
    });
  });

  it("does not manufacture edits when unchanged source spelling normalizes during mapping", () => {
    const source = task({ title: "  Source title  ", tags: ["Straße", "STRASSE"] });
    const baseline = buildEditTaskFormBaseline(source, "America/Denver");

    expect(planEditTaskSubmission(source, baseline.values, "America/Denver")).toEqual({
      kind: "edit",
      sourceRef: { id: "task-id", projectId: "inbox-id" },
    });
  });

  it("routes a move before the remaining patch and targets the confirmed move result", () => {
    const source = task();
    const baseline = buildEditTaskFormBaseline(source, "America/Denver");
    const plan = planEditTaskSubmission(
      source,
      {
        ...baseline.values,
        projectId: "work-id",
        title: "Updated title",
        priority: "5",
      },
      "America/Denver"
    );

    expect(plan).toEqual({
      kind: "edit",
      sourceRef: { id: "task-id", projectId: "inbox-id" },
      move: { targetProjectId: "work-id" },
      update: {
        refSource: "move-result",
        patch: { title: "Updated title", priority: 5 },
      },
    });
  });

  it("does not invent clear-field semantics for nullable or blank optional fields", () => {
    const source = task();
    const baseline = buildEditTaskFormBaseline(source, "America/Denver");
    const plan = planEditTaskSubmission(
      source,
      {
        ...baseline.values,
        description: "",
        startDate: null,
        dueDate: null,
        tags: "",
      },
      "America/Denver"
    );

    expect(plan).toEqual({
      kind: "edit",
      sourceRef: { id: "task-id", projectId: "inbox-id" },
    });
  });
});

describe("cross-zone DatePicker projection", () => {
  const denver = "America/Denver";
  const tokyo = "Asia/Tokyo";

  it("projects a Tokyo floating time into the same Denver wall time and assigns edits back to Tokyo", () => {
    const source = task({
      timeZone: tokyo,
      isFloating: true,
      isAllDay: false,
      startDate: "2026-08-15T09:00:00+09:00",
      dueDate: undefined,
    });
    const baseline = buildEditTaskFormBaseline(source, denver);

    expect(moment(baseline.values.startDate).tz(denver).format("YYYY-MM-DD HH:mm")).toBe("2026-08-15 09:00");
    expect(planEditTaskSubmission(source, baseline.values, denver).update).toBeUndefined();

    const changed = moment.tz("2026-08-15 10:00", "YYYY-MM-DD HH:mm", true, denver).toDate();
    expect(
      planEditTaskSubmission(source, { ...baseline.values, startDate: changed }, denver).update?.patch.startDate
    ).toBe("2026-08-15T10:00:00.000+09:00");
  });

  it("round-trips a Tokyo all-day calendar date as August 15 in the Denver picker", () => {
    const source = task({
      timeZone: tokyo,
      isFloating: false,
      isAllDay: true,
      startDate: "2026-08-15T00:00:00+09:00",
      dueDate: undefined,
    });
    const baseline = buildEditTaskFormBaseline(source, denver);

    expect(moment(baseline.values.startDate).tz(denver).format("YYYY-MM-DD HH:mm")).toBe("2026-08-15 00:00");
    expect(
      serializeTaskFormDate(baseline.values.startDate!, {
        isAllDay: true,
        isFloating: false,
        timeZone: tokyo,
        uiTimeZone: denver,
      })
    ).toBe("2026-08-15T00:00:00.000+09:00");
    expect(planEditTaskSubmission(source, baseline.values, denver).update).toBeUndefined();
  });

  it("keeps a bound Tokyo time as the same actual instant in Denver", () => {
    const source = task({
      timeZone: tokyo,
      isFloating: false,
      isAllDay: false,
      startDate: "2026-08-15T09:00:00+09:00",
      dueDate: undefined,
    });
    const baseline = buildEditTaskFormBaseline(source, denver);

    expect(baseline.values.startDate?.toISOString()).toBe("2026-08-15T00:00:00.000Z");
    expect(moment(baseline.values.startDate).tz(denver).format("YYYY-MM-DD HH:mm")).toBe("2026-08-14 18:00");
    expect(planEditTaskSubmission(source, baseline.values, denver).update).toBeUndefined();
  });

  it("handles folds deterministically and rejects a wall time in the target timezone DST gap", () => {
    const foldSelection = moment.tz("2026-11-01 01:30", "YYYY-MM-DD HH:mm", true, denver).toDate();
    expect(
      serializeTaskFormDate(foldSelection, {
        isAllDay: false,
        isFloating: true,
        timeZone: denver,
        uiTimeZone: denver,
      })
    ).toBe("2026-11-01T01:30:00.000-06:00");

    const tokyoGapSelection = moment.tz("2026-03-08 02:30", "YYYY-MM-DD HH:mm", true, tokyo).toDate();
    expect(() =>
      serializeTaskFormDate(tokyoGapSelection, {
        isAllDay: false,
        isFloating: true,
        timeZone: denver,
        uiTimeZone: tokyo,
      })
    ).toThrow("Selected wall time does not exist in the task timezone");
  });

  it("does not patch an unchanged floating fold even when UI projection chooses the other offset", () => {
    const source = task({
      timeZone: denver,
      isFloating: true,
      isAllDay: false,
      startDate: "2026-11-01T01:30:00-07:00",
      dueDate: undefined,
    });
    const baseline = buildEditTaskFormBaseline(source, denver);

    expect(moment(baseline.values.startDate).tz(denver).format("YYYY-MM-DD HH:mm Z")).toBe("2026-11-01 01:30 -06:00");
    expect(planEditTaskSubmission(source, baseline.values, denver).update).toBeUndefined();
  });
});

describe("submission gate", () => {
  it("coalesces repeated submits while pending and invokes the operation once", async () => {
    let release!: (value: string) => void;
    const pending = new Promise<string>((resolve) => {
      release = resolve;
    });
    const states: boolean[] = [];
    const gate = createSubmissionGate((isSubmitting) => states.push(isSubmitting));
    let calls = 0;

    const first = gate.submit(() => {
      calls += 1;
      return pending;
    });
    const second = gate.submit(() => {
      calls += 1;
      return Promise.resolve("duplicate");
    });

    expect(second).toBe(first);
    expect(calls).toBe(1);
    expect(gate.isSubmitting).toBe(true);
    release("done");
    await expect(first).resolves.toBe("done");
    expect(gate.isSubmitting).toBe(false);
    expect(states).toEqual([true, false]);
  });

  it("releases an ordinary failure for a deliberate manual retry", async () => {
    const failure = new Error("ordinary failure");
    const gate = createSubmissionGate();
    let calls = 0;

    await expect(
      gate.submit(async () => {
        calls += 1;
        throw failure;
      })
    ).rejects.toBe(failure);
    await expect(
      gate.submit(async () => {
        calls += 1;
        return "retried";
      })
    ).resolves.toBe("retried");
    expect(calls).toBe(2);
  });

  it("terminal-locks on ambiguity and preserves the original error for every later submit", async () => {
    const ambiguous = new AmbiguousMutationError("private upstream detail");
    const gate = createSubmissionGate();
    let calls = 0;

    await expect(
      gate.submit(async () => {
        calls += 1;
        throw ambiguous;
      })
    ).rejects.toBe(ambiguous);
    await expect(
      gate.submit(async () => {
        calls += 1;
        return "must not run";
      })
    ).rejects.toBe(ambiguous);

    expect(calls).toBe(1);
    expect(gate.terminalError).toBe(ambiguous);
  });
});

describe("tags and move destinations", () => {
  it("deduplicates tags by NFKC Unicode case-fold while preserving the first spelling", () => {
    expect(normalizeTags("Straße, STRASSE, Σίσυφος, ΣΊΣΥΦΟΣ, café, cafe\u0301, Team")).toEqual([
      "Straße",
      "Σίσυφος",
      "café",
      "Team",
    ]);
  });

  it("excludes the current project, closed projects, blank IDs, and duplicate IDs from move targets", () => {
    const candidates: Project[] = [
      ...projects,
      { id: "work-id", name: "Duplicate Work", kind: "project", closed: false },
      { id: "", name: "Invalid", kind: "project", closed: false },
    ];

    expect(availableMoveProjects(candidates, "inbox-id")).toEqual([
      { id: "work-id", name: "Work", kind: "project", closed: false },
    ]);
  });
});
