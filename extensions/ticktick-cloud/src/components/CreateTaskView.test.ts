import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { showToast, Toast } from "@raycast/api";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { AmbiguousMutationError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { CreateTaskInput, Task } from "../domain/task";
import TaskForm, { type TaskFormFieldAvailability, type TaskFormProps } from "./TaskForm";
import { createSubmissionGate, type TaskFormValues } from "./taskFormModel";
import CreateTaskView, { type CreateTaskViewProps } from "./CreateTaskView";

const raycast = vi.hoisted(() => ({
  pop: vi.fn(),
  showToast: vi.fn(),
}));

const react = vi.hoisted(() => {
  let cursor = 0;
  let effectCursor = 0;
  let refs: Array<{ current: unknown }> = [];
  let effectSetups: Array<(() => void | (() => void)) | undefined> = [];
  let cleanups: Array<(() => void) | undefined> = [];

  return {
    beginRender() {
      cursor = 0;
      effectCursor = 0;
    },
    reset() {
      cursor = 0;
      effectCursor = 0;
      refs = [];
      effectSetups = [];
      cleanups = [];
    },
    strictEffectsCycle() {
      for (const cleanup of cleanups) cleanup?.();
      cleanups = effectSetups.map((setup) => setup?.() ?? undefined);
    },
    unmount() {
      for (const cleanup of cleanups) cleanup?.();
      cleanups = [];
    },
    useRef<Value>(initialValue: Value): { current: Value } {
      const index = cursor;
      cursor += 1;
      if (!refs[index]) refs[index] = { current: initialValue };
      return refs[index] as { current: Value };
    },
    useEffect(effect: () => void | (() => void)): void {
      const index = effectCursor;
      effectCursor += 1;
      if (index < cleanups.length) return;
      effectSetups[index] = effect;
      cleanups[index] = effect() ?? undefined;
    },
  };
});

vi.mock("@raycast/api", () => ({
  showToast: raycast.showToast,
  Toast: { Style: { Success: "success" } },
  useNavigation: () => ({ pop: raycast.pop }),
}));

vi.mock("react", async () => ({
  ...(await vi.importActual<typeof import("react")>("react")),
  useEffect: react.useEffect,
  useRef: react.useRef,
}));

vi.mock("./TaskForm", () => ({
  default: function MockTaskForm() {
    return null;
  },
}));

const projects = Object.freeze([
  Object.freeze({ id: "first-project", name: "First Project", kind: "project", closed: false }),
  Object.freeze({ id: "remembered-project", name: "Remembered", kind: "project", closed: false }),
  Object.freeze({ id: "inbox-project", name: "Inbox", kind: "inbox", closed: false }),
  Object.freeze({ id: "closed-project", name: "Closed", kind: "project", closed: true }),
] satisfies readonly Project[]);

function task(overrides: Partial<Task> = {}): Task {
  const created: Task = {
    id: "created-task",
    projectId: "inbox-project",
    title: "Created task",
    projectName: "Inbox",
    status: "open",
    priority: 0,
    tags: [],
    kind: "TEXT",
    isAllDay: false,
    isFloating: true,
    timeZone: "UTC",
    ...overrides,
  };
  return Object.freeze(created);
}

function values(overrides: Partial<TaskFormValues> = {}): TaskFormValues {
  return {
    title: "Create the extension",
    projectId: "inbox-project",
    description: "",
    startDate: null,
    dueDate: null,
    isAllDay: false,
    priority: "0",
    tags: "",
    ...overrides,
  };
}

function renderView(overrides: Partial<CreateTaskViewProps> = {}): ReactElement<TaskFormProps> {
  react.beginRender();
  return CreateTaskView({
    contextKey: "mcp:account-a",
    projects,
    uiTimeZone: "UTC",
    createTask: vi.fn(async (input) => task({ projectId: input.projectId ?? "inbox-project" })),
    ...overrides,
  }) as ReactElement<TaskFormProps>;
}

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  react.reset();
  raycast.showToast.mockResolvedValue(undefined);
  raycast.pop.mockReturnValue(undefined);
});

describe("CreateTaskView form composition", () => {
  it("keeps the backend-neutral public props contract exact", () => {
    expectTypeOf<CreateTaskViewProps>().toEqualTypeOf<
      Readonly<{
        contextKey: string;
        projects: readonly Project[];
        uiTimeZone: string;
        rememberedProjectId?: string;
        defaultTitle?: string;
        defaultDate?: Date | null;
        fieldAvailability?: Partial<TaskFormFieldAvailability>;
        createTask(input: CreateTaskInput): Promise<Task>;
        mapCreateError?(error: unknown): unknown | Promise<unknown>;
        onCreated?(created: Task, confirmedProjectId: string): void | Promise<void>;
      }>
    >();
  });

  it("remounts form state for a new semantic context and retires captured old submissions", async () => {
    const pending = deferred<Task>();
    const createForA = vi.fn(() => pending.promise);
    const createForB = vi.fn(async () => task());
    const first = renderView({ contextKey: "mcp:account-a", defaultTitle: "Account A", createTask: createForA });
    const oldSubmit = first.props.onSubmit;
    const oldRunning = oldSubmit(values());
    const second = renderView({ contextKey: "mcp:account-b", defaultTitle: "Account B", createTask: createForB });

    expect(first.key).toBe("mcp:account-a");
    expect(second.key).toBe("mcp:account-b");
    expect(second.props.initialValues.title).toBe("Account B");

    pending.resolve(task());
    await expect(oldRunning).resolves.toBeUndefined();
    await expect(oldSubmit(values())).resolves.toBeUndefined();
    expect(createForA).toHaveBeenCalledOnce();
    expect(showToast).not.toHaveBeenCalled();
    expect(raycast.pop).not.toHaveBeenCalled();

    await expect(second.props.onSubmit(values())).resolves.toBeUndefined();
    expect(createForB).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledOnce();
    expect(raycast.pop).toHaveBeenCalledOnce();
  });

  it("suppresses stale global effects when context changes during post-confirm persistence", async () => {
    const persistence = deferred<void>();
    const onCreated = vi.fn(() => persistence.promise);
    const first = renderView({ contextKey: "mcp:account-a", onCreated });
    const running = first.props.onSubmit(values());

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    renderView({ contextKey: "mcp:account-b" });
    persistence.resolve();
    await expect(running).resolves.toBeUndefined();

    expect(showToast).not.toHaveBeenCalled();
    expect(raycast.pop).not.toHaveBeenCalled();
  });

  it("suppresses an in-flight completion after the form unmounts", async () => {
    const pending = deferred<Task>();
    const createTask = vi.fn(() => pending.promise);
    const rendered = renderView({ createTask });
    const running = rendered.props.onSubmit(values());

    react.unmount();
    pending.resolve(task());
    await expect(running).resolves.toBeUndefined();

    expect(showToast).not.toHaveBeenCalled();
    expect(raycast.pop).not.toHaveBeenCalled();
  });

  it("remains active through React's development Strict Effects cleanup and setup cycle", async () => {
    const createTask = vi.fn(async () => task());
    const rendered = renderView({ createTask });

    react.strictEffectsCycle();
    await expect(rendered.props.onSubmit(values())).resolves.toBeUndefined();

    expect(createTask).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledOnce();
    expect(raycast.pop).toHaveBeenCalledOnce();
  });

  it("passes the once-snapshotted confirmed project id through post-confirm effects", async () => {
    let projectIdReads = 0;
    const created = Object.defineProperty({ ...task() }, "projectId", {
      get() {
        projectIdReads += 1;
        return projectIdReads === 1 ? "inbox-project" : "different-project";
      },
    }) as Task;
    const onCreated = vi.fn();
    const rendered = renderView({ createTask: vi.fn(async () => created), onCreated });

    await expect(rendered.props.onSubmit(values())).resolves.toBeUndefined();

    expect(projectIdReads).toBe(1);
    expect(onCreated).toHaveBeenCalledWith(created, "inbox-project");
  });

  it("does not present a rejected create from a retired context", async () => {
    const pending = deferred<Task>();
    const failure = new Error("PRIVATE old account failure");
    const mapCreateError = vi.fn(() => new Error("mapped"));
    const first = renderView({ createTask: () => pending.promise, mapCreateError });
    const running = first.props.onSubmit(values());

    renderView({ contextKey: "mcp:account-b" });
    pending.reject(failure);
    await expect(running).resolves.toBeUndefined();

    expect(mapCreateError).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(raycast.pop).not.toHaveBeenCalled();
  });

  it("wires create mode, authoritative projects, floating UI-timezone semantics, fields, and cloned defaults", () => {
    const defaultDate = Object.freeze(new Date("2026-08-14T09:30:00.000Z"));
    const fieldAvailability = Object.freeze({ description: false, tags: true });
    const beforeProjects = JSON.stringify(projects);
    const rendered = renderView({
      rememberedProjectId: "remembered-project",
      defaultTitle: "Default title",
      defaultDate,
      fieldAvailability,
    });

    expect(rendered.type).toBe(TaskForm);
    expect(rendered.props.mode).toBe("create");
    expect(rendered.props.projects).toBe(projects);
    expect(rendered.props.dateSemantics).toEqual({ isFloating: true, timeZone: "UTC", uiTimeZone: "UTC" });
    expect(rendered.props.fieldAvailability).toBe(fieldAvailability);
    expect(rendered.props.initialValues).toEqual({
      title: "Default title",
      projectId: "remembered-project",
      description: "",
      startDate: null,
      dueDate: new Date("2026-08-14T09:30:00.000Z"),
      isAllDay: false,
      priority: "0",
      tags: "",
    });
    expect(rendered.props.initialValues.dueDate).not.toBe(defaultDate);
    expect(defaultDate.toISOString()).toBe("2026-08-14T09:30:00.000Z");
    expect(JSON.stringify(projects)).toBe(beforeProjects);
    expect(projects.every(Object.isFrozen)).toBe(true);
  });

  it("uses a real open Inbox fallback and never silently selects the first project", () => {
    const inboxFallback = renderView({ rememberedProjectId: "closed-project" });
    const noInboxProjects = Object.freeze([
      Object.freeze({ id: "first-project", name: "First", kind: "project", closed: false }),
      Object.freeze({ id: "closed-inbox", name: "Inbox", kind: "inbox", closed: true }),
    ] satisfies readonly Project[]);
    const noDestination = renderView({ projects: noInboxProjects, rememberedProjectId: "missing" });

    expect(inboxFallback.props.initialValues.projectId).toBe("inbox-project");
    expect(noDestination.props.initialValues.projectId).toBe("");
    expect(noDestination.props.initialValues.projectId).not.toBe("first-project");
    expect(noDestination.props.projects).toBe(noInboxProjects);
  });

  it("keeps unavailable fields neutral in the form and omits them from create input", async () => {
    const defaultDate = Object.freeze(new Date("2026-08-14T09:30:00.000Z"));
    const fieldAvailability = Object.freeze({
      project: false,
      description: false,
      startDate: false,
      dueDate: false,
      isAllDay: false,
      priority: false,
      tags: false,
    } satisfies Partial<TaskFormFieldAvailability>);
    const createTask = vi.fn(async () => task());
    const rendered = renderView({ defaultDate, fieldAvailability, createTask });

    expect(rendered.props.initialValues.projectId).toBe("inbox-project");
    expect(rendered.props.initialValues.dueDate).toBeNull();
    await rendered.props.onSubmit(
      values({
        description: "must not leak",
        startDate: new Date("2026-08-14T08:00:00.000Z"),
        dueDate: new Date("2026-08-14T09:00:00.000Z"),
        isAllDay: true,
        priority: "5",
        tags: "must-not-leak",
      })
    );

    expect(createTask).toHaveBeenCalledWith({
      title: "Create the extension",
      isFloating: true,
      timeZone: "UTC",
    });
    expect(defaultDate.toISOString()).toBe("2026-08-14T09:30:00.000Z");
  });
});

describe("CreateTaskView submission boundary", () => {
  it("maps title, project, description, dates, priority, and normalized tags exactly before confirming success", async () => {
    const order: string[] = [];
    const created = task({
      id: "PRIVATE-ID-created",
      title: "PRIVATE-TITLE-created",
      content: "PRIVATE-CONTENT-created",
    });
    const createTask = vi.fn(async (input: CreateTaskInput) => {
      order.push("create");
      expect(input).toEqual({
        title: "Create the extension",
        projectId: "inbox-project",
        description: "Release notes",
        startDate: "2026-08-14T09:30:00.000+00:00",
        dueDate: "2026-08-14T11:45:00.000+00:00",
        isAllDay: false,
        isFloating: true,
        timeZone: "UTC",
        priority: 5,
        tags: ["Release", "windows"],
      });
      return created;
    });
    const onCreated = vi.fn(async (confirmed: Task, confirmedProjectId: string) => {
      order.push("created");
      expect(confirmed).toBe(created);
      expect(confirmedProjectId).toBe("inbox-project");
    });
    raycast.showToast.mockImplementation(async () => {
      order.push("toast");
    });
    raycast.pop.mockImplementation(() => {
      order.push("pop");
    });
    const rendered = renderView({ createTask, onCreated });
    const submitted = Object.freeze(
      values({
        title: "  Create the extension  ",
        description: "Release notes",
        startDate: Object.freeze(new Date("2026-08-14T09:30:00.000Z")),
        dueDate: Object.freeze(new Date("2026-08-14T11:45:00.000Z")),
        priority: "5",
        tags: " Release, windows, release ",
      })
    );
    const before = JSON.stringify(submitted);

    await expect(rendered.props.onSubmit(submitted)).resolves.toBeUndefined();

    expect(createTask).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledWith(created, "inbox-project");
    expect(showToast).toHaveBeenCalledWith({ style: Toast.Style.Success, title: "Task Added" });
    expect(raycast.pop).toHaveBeenCalledWith();
    expect(order).toEqual(["create", "created", "toast", "pop"]);
    expect(JSON.stringify(submitted)).toBe(before);
  });

  it("delegates concurrent single-flight identity to the TaskForm submission gate", async () => {
    const pending = deferred<Task>();
    const createTask = vi.fn(() => pending.promise);
    const rendered = renderView({ createTask });
    const gate = createSubmissionGate();
    const submitted = values();

    const first = gate.submit(() => rendered.props.onSubmit(submitted));
    const second = gate.submit(() => rendered.props.onSubmit(submitted));

    expect(second).toBe(first);
    expect(createTask).toHaveBeenCalledTimes(1);
    pending.resolve(task());
    await expect(first).resolves.toBeUndefined();
    expect(createTask).toHaveBeenCalledTimes(1);
  });

  it("preserves and rethrows an original pre-confirmation failure with no success effects", async () => {
    const failure = new Error("PRIVATE raw backend failure");
    const createTask = vi.fn(async () => {
      throw failure;
    });
    const onCreated = vi.fn();
    const rendered = renderView({ createTask, onCreated });

    await expect(rendered.props.onSubmit(values())).rejects.toBe(failure);

    expect(createTask).toHaveBeenCalledTimes(1);
    expect(onCreated).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(raycast.pop).not.toHaveBeenCalled();
  });

  it.each([
    ["missing result", undefined],
    ["blank id", task({ id: " \t " })],
    ["different project", task({ projectId: "different-project" })],
    [
      "hostile id accessor",
      Object.defineProperty({ projectId: "inbox-project" }, "id", {
        get() {
          throw new Error("PRIVATE hostile confirmation");
        },
      }),
    ],
  ])("turns a %s confirmation into a fixed terminal ambiguity", async (_name, result) => {
    const createTask = vi.fn(async () => result as Task);
    const onCreated = vi.fn();
    const rendered = renderView({ createTask, onCreated });
    const gate = createSubmissionGate();
    const submitted = values();

    const first = gate.submit(() => rendered.props.onSubmit(submitted));
    const ambiguity = await first.catch((error: unknown) => error);

    expect(ambiguity).toBeInstanceOf(AmbiguousMutationError);
    expect(ambiguity).toMatchObject({
      message: "Task creation status could not be confirmed.",
      code: "ambiguous_mutation",
      retryable: false,
    });
    expect((ambiguity as Error & { cause?: unknown }).cause).toBeUndefined();
    await expect(gate.submit(() => rendered.props.onSubmit(submitted))).rejects.toBe(ambiguity);
    expect(gate.terminalError).toBe(ambiguity);
    expect(createTask).toHaveBeenCalledTimes(1);
    expect(onCreated).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(raycast.pop).not.toHaveBeenCalled();
    expect(JSON.stringify(ambiguity)).not.toContain("PRIVATE");
  });

  it("treats every post-confirmation effect as independent best effort", async () => {
    const created = task();
    const createTask = vi.fn(async () => created);
    const onCreated = vi.fn(() => {
      throw new Error("PRIVATE callback failure");
    });
    raycast.showToast.mockRejectedValue(new Error("PRIVATE toast failure"));
    raycast.pop.mockImplementation(() => {
      throw new Error("PRIVATE navigation failure");
    });
    const rendered = renderView({ createTask, onCreated });

    await expect(rendered.props.onSubmit(values())).resolves.toBeUndefined();

    expect(createTask).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledWith(created, "inbox-project");
    expect(showToast).toHaveBeenCalledWith({ style: Toast.Style.Success, title: "Task Added" });
    expect(raycast.pop).toHaveBeenCalledWith();
  });

  it.each(["throws", "rejects"] as const)(
    "latches confirmed success across repeated submits and renders when pop %s",
    async (failureMode) => {
      const marker = `PRIVATE navigation ${failureMode}`;
      const created = task();
      const createTask = vi.fn(async () => created);
      const onCreated = vi.fn(async () => undefined);
      if (failureMode === "throws") {
        raycast.pop.mockImplementation(() => {
          throw new Error(marker);
        });
      } else {
        raycast.pop.mockImplementation(() => Promise.reject(new Error(marker)));
      }
      const props = { createTask, onCreated } satisfies Partial<CreateTaskViewProps>;
      const firstRender = renderView(props);
      const capturedSubmit = firstRender.props.onSubmit;

      await expect(capturedSubmit(values())).resolves.toBeUndefined();
      await expect(capturedSubmit(values())).resolves.toBeUndefined();
      const nextRender = renderView(props);
      await expect(nextRender.props.onSubmit(values())).resolves.toBeUndefined();

      expect(createTask).toHaveBeenCalledTimes(1);
      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(showToast).toHaveBeenCalledTimes(1);
      expect(raycast.pop).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(raycast.showToast.mock.calls)).not.toContain(marker);
    }
  );

  it("does not latch an ordinary failure before a later exact confirmation", async () => {
    const failure = new Error("PRIVATE first create failure");
    const created = task();
    const createTask = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(created);
    const onCreated = vi.fn();
    const rendered = renderView({ createTask, onCreated });

    await expect(rendered.props.onSubmit(values())).rejects.toBe(failure);
    await expect(rendered.props.onSubmit(values())).resolves.toBeUndefined();

    expect(createTask).toHaveBeenCalledTimes(2);
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(raycast.pop).toHaveBeenCalledTimes(1);
  });

  it("keeps task data and raw errors out of fixed toast and navigation descriptors", async () => {
    const marker = "PRIVATE-MARKER-create-view";
    const created = task({
      id: `${marker}-id`,
      title: `${marker}-title`,
      content: `${marker}-content`,
      projectName: `${marker}-project`,
    });
    const rendered = renderView({ createTask: vi.fn(async () => created) });

    await rendered.props.onSubmit(values());

    expect(raycast.showToast.mock.calls).toEqual([[{ style: Toast.Style.Success, title: "Task Added" }]]);
    expect(JSON.stringify(raycast.showToast.mock.calls)).not.toContain(marker);
    expect(raycast.pop.mock.calls).toEqual([[]]);
  });
});

describe("CreateTaskView dependency and retry boundary", () => {
  it("uses only the accepted form/model, domain types, and Raycast presentation boundary", () => {
    const source = readFileSync(resolve(__dirname, "CreateTaskView.tsx"), "utf8");
    const imports = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g), (match) => match[1]).sort();

    expect(imports).toEqual([
      "../domain/errors",
      "../domain/project",
      "../domain/task",
      "./TaskForm",
      "./taskFormModel",
      "@raycast/api",
      "react",
    ]);
    expect(source).not.toMatch(
      /service|osScript|TickTickBackend|TaskRepository|fetch\s*\(|XMLHttpRequest|axios|console\.|showFailureToast/
    );
    expect(source).not.toMatch(
      /createSubmissionGate|SubmissionGate|setTimeout|setInterval|retry|onRetry|Action\.|ActionPanel/
    );
    expect(source).not.toMatch(/created\.(?:title|content|description|id)|error\.(?:message|stack|cause)/);
  });
});
