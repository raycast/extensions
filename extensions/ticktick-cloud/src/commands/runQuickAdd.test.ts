import { describe, expect, it, vi } from "vitest";

import { AmbiguousMutationError, NetworkError, ProtocolError, ValidationError } from "../domain/errors";
import type { Project } from "../domain/project";
import type { CreateTaskInput, Task } from "../domain/task";
import { runQuickAdd } from "./runQuickAdd";

const inboxProject: Project = {
  id: "project-inbox",
  name: "Inbox",
  kind: "inbox",
  closed: false,
};

const workProject: Project = {
  id: "project-work",
  name: "Work",
  kind: "project",
  closed: false,
};

const CONFIRMATION_ERROR_MESSAGE = "Task creation status could not be confirmed.";

function taskFixture(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-confirmed",
    projectId: workProject.id,
    projectName: workProject.name,
    title: "Private task title",
    status: "open",
    priority: 0,
    tags: [],
    kind: "TEXT",
    isAllDay: false,
    isFloating: true,
    timeZone: "America/Denver",
    content: "Private task content",
    ...overrides,
  };
}

function dependencies(
  overrides: Partial<{
    createTask(input: CreateTaskInput): Promise<Task>;
    resolveDestination(): Promise<Project>;
  }> = {}
) {
  return {
    createTask: vi.fn(async (input: CreateTaskInput) =>
      taskFixture({
        projectId: input.projectId ?? inboxProject.id,
        projectName: input.projectId === workProject.id ? workProject.name : inboxProject.name,
        title: input.title,
        description: input.description,
      })
    ),
    resolveDestination: vi.fn(async () => workProject),
    ...overrides,
  };
}

describe("runQuickAdd", () => {
  it("trims input, resolves one authoritative destination, creates once, and returns only safe confirmation", async () => {
    let confirm!: (task: Task) => void;
    const confirmation = new Promise<Task>((resolve) => {
      confirm = resolve;
    });
    const createTask = vi.fn<(input: CreateTaskInput) => Promise<Task>>().mockReturnValue(confirmation);
    const resolveDestination = vi.fn(async () => workProject);
    let settled = false;

    const running = runQuickAdd(
      { createTask, resolveDestination },
      { title: "  Secret launch plan  ", description: "  Private details  " }
    ).then((result) => {
      settled = true;
      return result;
    });

    await vi.waitFor(() => expect(createTask).toHaveBeenCalledOnce());
    expect(settled).toBe(false);
    expect(resolveDestination).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledWith({
      title: "Secret launch plan",
      description: "Private details",
      projectId: workProject.id,
    });

    confirm(taskFixture());

    await expect(running).resolves.toEqual({ title: "Task Added", projectName: workProject.name });
    const result = await running;
    expect(Object.keys(result)).toEqual(["title", "projectName"]);
    expect(JSON.stringify(result)).not.toContain("Secret launch plan");
    expect(JSON.stringify(result)).not.toContain("Private details");
    expect(createTask).toHaveBeenCalledOnce();
  });

  it.each([undefined, "", "   \n\t  "])("omits an empty normalized description (%s)", async (description) => {
    const deps = dependencies();

    await runQuickAdd(deps, { title: "  Buy milk  ", description });

    expect(deps.createTask).toHaveBeenCalledWith({ title: "Buy milk", projectId: workProject.id });
    expect(deps.createTask).toHaveBeenCalledOnce();
    expect(deps.resolveDestination).toHaveBeenCalledOnce();
  });

  it.each(["", "   ", "\n\t"])("rejects a blank title before resolving any destination (%j)", async (title) => {
    const deps = dependencies();

    await expect(runQuickAdd(deps, { title })).rejects.toBeInstanceOf(ValidationError);

    expect(deps.resolveDestination).not.toHaveBeenCalled();
    expect(deps.createTask).not.toHaveBeenCalled();
  });

  it("preserves a destination-resolution failure and never attempts creation", async () => {
    const failure = new NetworkError("Destination lookup failed.");
    const deps = dependencies({ resolveDestination: vi.fn().mockRejectedValue(failure) });

    await expect(runQuickAdd(deps, { title: "Task" })).rejects.toBe(failure);

    expect(deps.resolveDestination).toHaveBeenCalledOnce();
    expect(deps.createTask).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", undefined],
    ["blank id", { ...workProject, id: "   " }],
    ["blank name", { ...workProject, name: "  " }],
    ["closed", { ...workProject, closed: true }],
    ["unsupported kind", { ...workProject, kind: "smart" }],
  ])("rejects an invalid %s destination without creating a task", async (_case, destination) => {
    const deps = dependencies({ resolveDestination: vi.fn(async () => destination as Project) });

    await expect(runQuickAdd(deps, { title: "Task" })).rejects.toBeInstanceOf(ProtocolError);

    expect(deps.resolveDestination).toHaveBeenCalledOnce();
    expect(deps.createTask).not.toHaveBeenCalled();
  });

  it("converts a hostile destination getter into the fixed pre-create protocol error", async () => {
    const privateMarker = "private-destination-getter";
    const destination = Object.defineProperty({}, "id", {
      get() {
        throw new Error(privateMarker);
      },
    }) as Project;
    const deps = dependencies({ resolveDestination: vi.fn(async () => destination) });

    const failure = await captureFailure(() => runQuickAdd(deps, { title: "Private task" }));

    expect(failure).toBeInstanceOf(ProtocolError);
    expect(failure).toMatchObject({ message: "TickTick returned an invalid task destination." });
    expect((failure as Error).message).not.toContain(privateMarker);
    expect(deps.createTask).not.toHaveBeenCalled();
  });

  it("snapshots every authoritative destination field once before creating and confirming", async () => {
    const reads = { id: 0, name: 0, kind: 0, closed: 0 };
    const destination = {
      get id() {
        reads.id += 1;
        if (reads.id > 1) throw new Error("destination id was read twice");
        return workProject.id;
      },
      get name() {
        reads.name += 1;
        if (reads.name > 1) throw new Error("destination name was read twice");
        return workProject.name;
      },
      get kind() {
        reads.kind += 1;
        if (reads.kind > 1) throw new Error("destination kind was read twice");
        return workProject.kind;
      },
      get closed() {
        reads.closed += 1;
        if (reads.closed > 1) throw new Error("destination closed was read twice");
        return workProject.closed;
      },
    } as Project;
    const deps = dependencies({ resolveDestination: vi.fn(async () => destination) });

    await expect(runQuickAdd(deps, { title: "Task" })).resolves.toEqual({
      title: "Task Added",
      projectName: workProject.name,
    });

    expect(reads).toEqual({ id: 1, name: 1, kind: 1, closed: 1 });
    expect(deps.createTask).toHaveBeenCalledWith({ title: "Task", projectId: workProject.id });
    expect(deps.createTask).toHaveBeenCalledOnce();
  });

  it("uses the frozen destination snapshot when the original object mutates during creation", async () => {
    const originalDestination: Project = { ...workProject };
    const createTask = vi.fn(async (input: CreateTaskInput) => {
      originalDestination.id = inboxProject.id;
      originalDestination.name = inboxProject.name;
      originalDestination.kind = inboxProject.kind;
      originalDestination.closed = true;
      return taskFixture({
        projectId: input.projectId ?? workProject.id,
        projectName: workProject.name,
        title: input.title,
      });
    });
    const deps = dependencies({
      createTask,
      resolveDestination: vi.fn(async () => originalDestination),
    });

    await expect(runQuickAdd(deps, { title: "Task" })).resolves.toEqual({
      title: "Task Added",
      projectName: workProject.name,
    });

    expect(createTask).toHaveBeenCalledWith({ title: "Task", projectId: workProject.id });
    expect(createTask).toHaveBeenCalledOnce();
  });

  it("accepts an open Inbox as a real destination and passes its exact id", async () => {
    const deps = dependencies({ resolveDestination: vi.fn(async () => inboxProject) });

    await expect(runQuickAdd(deps, { title: "Inbox task" })).resolves.toEqual({
      title: "Task Added",
      projectName: inboxProject.name,
    });

    expect(deps.createTask).toHaveBeenCalledWith({ title: "Inbox task", projectId: inboxProject.id });
    expect(deps.createTask).toHaveBeenCalledOnce();
  });

  it.each([
    ["ordinary", new Error("Ordinary failure")],
    ["timeout", new DOMException("Timed out", "TimeoutError")],
    ["network", new NetworkError("Network failure")],
    ["ambiguous", new AmbiguousMutationError("Task creation status is unknown.")],
  ])("preserves an original %s creation failure and never retries", async (_case, failure) => {
    const createTask = vi.fn().mockRejectedValue(failure);
    const deps = dependencies({ createTask });

    await expect(runQuickAdd(deps, { title: "Task" })).rejects.toBe(failure);

    expect(deps.resolveDestination).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledOnce();
  });

  it.each([
    ["missing task", undefined],
    ["blank task id", taskFixture({ id: "   " })],
    ["blank project id", taskFixture({ projectId: "  " })],
    ["different project", taskFixture({ projectId: inboxProject.id, projectName: inboxProject.name })],
  ])("classifies a malformed confirmation (%s) as terminal ambiguity without retry", async (_case, task) => {
    const createTask = vi.fn(async () => task as Task);
    const deps = dependencies({ createTask });

    const failure = await captureFailure(() => runQuickAdd(deps, { title: "Highly private title" }));

    expect(failure).toBeInstanceOf(AmbiguousMutationError);
    expect(failure).toMatchObject({
      message: CONFIRMATION_ERROR_MESSAGE,
      code: "ambiguous_mutation",
      retryable: false,
    });
    expect(failure).not.toBeInstanceOf(ProtocolError);
    expect((failure as Error).message).not.toContain("Highly private title");
    expect(deps.resolveDestination).toHaveBeenCalledOnce();
    expect(createTask).toHaveBeenCalledOnce();
  });

  it("converts a hostile confirmation getter into the same terminal ambiguity", async () => {
    const privateMarker = "private-confirmation-getter";
    const confirmation = Object.defineProperty({}, "id", {
      get() {
        throw new Error(privateMarker);
      },
    }) as Task;
    const createTask = vi.fn(async () => confirmation);
    const deps = dependencies({ createTask });

    const failure = await captureFailure(() => runQuickAdd(deps, { title: "Private task" }));

    expect(failure).toBeInstanceOf(AmbiguousMutationError);
    expect(failure).toMatchObject({ message: CONFIRMATION_ERROR_MESSAGE });
    expect((failure as Error).message).not.toContain(privateMarker);
    expect(createTask).toHaveBeenCalledOnce();
  });

  it("converts a hostile confirmation projectId getter into the same terminal ambiguity", async () => {
    const privateMarker = "private-confirmation-project-getter";
    const confirmation = Object.defineProperties(
      {},
      {
        id: { value: "task-confirmed" },
        projectId: {
          get() {
            throw new Error(privateMarker);
          },
        },
      }
    ) as Task;
    const createTask = vi.fn(async () => confirmation);
    const deps = dependencies({ createTask });

    const failure = await captureFailure(() => runQuickAdd(deps, { title: "Private task" }));

    expect(failure).toBeInstanceOf(AmbiguousMutationError);
    expect(failure).toMatchObject({ message: CONFIRMATION_ERROR_MESSAGE });
    expect((failure as Error).message).not.toContain(privateMarker);
    expect(createTask).toHaveBeenCalledOnce();
  });
});

async function captureFailure(operation: () => Promise<unknown>): Promise<unknown> {
  try {
    await operation();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the operation to fail");
}
