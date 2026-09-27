import { describe, expect, it } from "vitest";

import { NotFoundError, ProtocolError } from "../../domain/errors";
import {
  INBOX_PROJECT_NAME,
  isInboxProjectId,
  normalizeMcpProjects,
  normalizeMcpTask,
  normalizeMcpTaskList,
  normalizeMcpTaskStatus,
  synthesizeInboxProject,
  unwrapMcpResult,
} from "./normalizers";

const projectNames: ReadonlyMap<string, string> = new Map([
  ["project-work", "Work"],
  ["project-home", "Home"],
]);

const baseTask = { id: "task-1", projectId: "project-work", title: "Task", status: 0 };

function captureError(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    return error as Error;
  }
  throw new Error("Expected the call to throw.");
}

describe("unwrapMcpResult", () => {
  it("unwraps the live result envelope", () => {
    const tasks = [{ id: "task-1" }];
    expect(unwrapMcpResult({ result: tasks })).toBe(tasks);
    expect(unwrapMcpResult({ result: "task moved" })).toBe("task moved");
    expect(unwrapMcpResult({ result: null })).toBeNull();
  });

  it("accepts the bare payloads mutation tools return without an envelope", () => {
    const bareTask = { id: "task-1", projectId: "inbox926", title: "Created", status: 0 };
    expect(unwrapMcpResult(bareTask)).toBe(bareTask);
    const bareList = [{ id: "task-1" }];
    expect(unwrapMcpResult(bareList)).toBe(bareList);
  });

  it("rejects unstructured primitive payloads", () => {
    expect(() => unwrapMcpResult(undefined)).toThrow(ProtocolError);
    expect(() => unwrapMcpResult(null)).toThrow(ProtocolError);
    expect(() => unwrapMcpResult("done")).toThrow(ProtocolError);
    expect(() => unwrapMcpResult(42)).toThrow(ProtocolError);
  });

  it("maps not-found tool errors to NotFoundError", () => {
    expect(() => unwrapMcpResult({ result: { error: "task not found" } })).toThrow(NotFoundError);
    expect(() => unwrapMcpResult({ result: { error: "Task does not exist" } })).toThrow(NotFoundError);
    expect(() => unwrapMcpResult({ result: { error: "no such project" } })).toThrow(NotFoundError);
  });

  it("maps other tool errors to ProtocolError", () => {
    expect(() => unwrapMcpResult({ result: { error: "quota exceeded" } })).toThrow(ProtocolError);
    expect(() => unwrapMcpResult({ result: { error: "internal failure" } })).toThrow(ProtocolError);
  });

  it("raises fixed messages that never echo remote error text", () => {
    const notFound = captureError(() => unwrapMcpResult({ result: { error: "task not found: id=SECRET-42" } }));
    expect(notFound).toBeInstanceOf(NotFoundError);
    expect(notFound.message).not.toContain("SECRET-42");
    expect(notFound.message).toBe(
      captureError(() => unwrapMcpResult({ result: { error: "no such task 99" } })).message
    );

    const failure = captureError(() => unwrapMcpResult({ result: { error: "boom token=abc123 <script>" } }));
    expect(failure).toBeInstanceOf(ProtocolError);
    expect(failure.message).not.toContain("abc123");
    expect(failure.message).toBe(
      captureError(() => unwrapMcpResult({ result: { error: "a completely different failure" } })).message
    );
  });

  it("treats results that merely include an error field among data as data", () => {
    const taskLike = { id: "task-1", error: "stale sync warning" };
    expect(unwrapMcpResult({ result: taskLike })).toBe(taskLike);

    const nonStringError = { error: 500 };
    expect(unwrapMcpResult({ result: nonStringError })).toBe(nonStringError);
  });
});

describe("inbox project synthesis", () => {
  it("recognizes inbox-prefixed project ids", () => {
    expect(isInboxProjectId("inbox125342")).toBe(true);
    expect(isInboxProjectId("inbox")).toBe(true);
    expect(isInboxProjectId("project-work")).toBe(false);
    expect(isInboxProjectId("my-inbox")).toBe(false);
  });

  it("synthesizes an inbox project entry from a discovered id", () => {
    expect(synthesizeInboxProject("inbox125342")).toEqual({
      id: "inbox125342",
      name: INBOX_PROJECT_NAME,
      kind: "inbox",
      closed: false,
    });
  });

  it("refuses to synthesize an inbox from a non-inbox id", () => {
    expect(() => synthesizeInboxProject("project-work")).toThrow(ProtocolError);
  });
});

describe("normalizeMcpProjects", () => {
  it("normalizes a flat project array with nullable live fields", () => {
    const projects = normalizeMcpProjects([
      { id: "project-work", name: "Work", color: "#f18181", closed: null },
      { id: "project-home", name: "Home", closed: true },
    ]);
    expect(projects).toEqual([
      { id: "project-work", name: "Work", kind: "project", closed: false },
      { id: "project-home", name: "Home", kind: "project", closed: true },
    ]);
  });

  it("derives the inbox kind from an inbox-prefixed id", () => {
    expect(normalizeMcpProjects([{ id: "inbox125342", name: "Inbox" }])).toEqual([
      { id: "inbox125342", name: INBOX_PROJECT_NAME, kind: "inbox", closed: false },
    ]);
  });

  it("rejects duplicate project identities", () => {
    expect(() =>
      normalizeMcpProjects([
        { id: "project-a", name: "A" },
        { id: "project-a", name: "B" },
      ])
    ).toThrow(ProtocolError);
  });

  it("rejects malformed project payloads", () => {
    expect(() => normalizeMcpProjects({ projects: [] })).toThrow(ProtocolError);
    expect(() => normalizeMcpProjects([{ name: "No identifier" }])).toThrow(ProtocolError);
    expect(() => normalizeMcpProjects([{ id: "project-a", name: " " }])).toThrow(ProtocolError);
    expect(() => normalizeMcpProjects([{ id: "project-a" }])).toThrow(ProtocolError);
    expect(() => normalizeMcpProjects(["project-a"])).toThrow(ProtocolError);
  });
});

describe("normalizeMcpTask", () => {
  it("normalizes a complete live-shaped task", () => {
    const task = normalizeMcpTask(
      {
        id: "task-1",
        projectId: "project-work",
        title: "Ship the port",
        status: 2,
        priority: 5,
        tags: ["alpha", 7, "", "beta"],
        kind: "checklist",
        isAllDay: true,
        isFloating: true,
        timeZone: "America/Denver",
        content: "Body text",
        desc: "Checklist summary",
        startDate: "2026-08-14T10:00:00.000+0000",
        dueDate: "2026-08-15T10:00:00.000+0000",
        items: [
          {
            id: "item-1",
            title: "Draft",
            status: 0,
            sortOrder: 2,
            startDate: "2026-08-14T10:00:00.000+0000",
            isAllDay: false,
          },
          { id: "item-2", title: "Review", status: 1 },
          { id: "item-3", title: "Publish", status: 2 },
        ],
      },
      projectNames
    );

    expect(task).toEqual({
      id: "task-1",
      projectId: "project-work",
      projectName: "Work",
      title: "Ship the port",
      status: "completed",
      priority: 5,
      tags: ["alpha", "beta"],
      kind: "CHECKLIST",
      isAllDay: true,
      isFloating: true,
      timeZone: "America/Denver",
      content: "Body text",
      description: "Checklist summary",
      startDate: "2026-08-14T10:00:00.000+0000",
      dueDate: "2026-08-15T10:00:00.000+0000",
      items: [
        {
          id: "item-1",
          title: "Draft",
          status: "open",
          sortOrder: 2,
          startDate: "2026-08-14T10:00:00.000+0000",
          isAllDay: false,
        },
        { id: "item-2", title: "Review", status: "completed", sortOrder: 0 },
        { id: "item-3", title: "Publish", status: "completed", sortOrder: 0 },
      ],
    });
  });

  it("tolerates nullable live fields with safe defaults", () => {
    const task = normalizeMcpTask(
      {
        id: "task-2",
        projectId: "project-home",
        title: "Minimal",
        status: null,
        priority: null,
        tags: null,
        kind: null,
        timeZone: null,
        content: null,
        desc: null,
        items: null,
      },
      projectNames
    );

    expect(task).toEqual({
      id: "task-2",
      projectId: "project-home",
      projectName: "Home",
      title: "Minimal",
      status: "open",
      priority: 0,
      tags: [],
      kind: "TEXT",
      isAllDay: false,
      isFloating: false,
      timeZone: "UTC",
    });
  });

  it.each([
    [0, "open"],
    [2, "completed"],
    [-1, "completed"],
  ])("maps the live integer status %d to %s", (status, expected) => {
    expect(normalizeMcpTask({ ...baseTask, status }, projectNames).status).toBe(expected);
  });

  it("treats a missing status as open", () => {
    const withoutStatus = { id: "task-1", projectId: "project-work", title: "Task" };
    expect(normalizeMcpTask(withoutStatus, projectNames).status).toBe("open");
  });

  it("rejects the undocumented live status 1 and retired string statuses", () => {
    expect(() => normalizeMcpTask({ ...baseTask, status: 1 }, projectNames)).toThrow(ProtocolError);
    expect(() => normalizeMcpTask({ ...baseTask, status: "open" }, projectNames)).toThrow(ProtocolError);
  });

  it("maps content and desc onto content and description", () => {
    const task = normalizeMcpTask({ ...baseTask, content: "Note body", desc: "Checklist text" }, projectNames);
    expect(task.content).toBe("Note body");
    expect(task.description).toBe("Checklist text");

    const fallback = normalizeMcpTask({ ...baseTask, description: "Direct description" }, projectNames);
    expect(fallback.description).toBe("Direct description");
  });

  it("defaults priorities outside the verified set to none", () => {
    expect(normalizeMcpTask({ ...baseTask, priority: 2 }, projectNames).priority).toBe(0);
    expect(normalizeMcpTask({ ...baseTask, priority: 1 }, projectNames).priority).toBe(1);
  });

  it("resolves the project name from the discovered map", () => {
    expect(normalizeMcpTask(baseTask, projectNames).projectName).toBe("Work");
  });

  it("falls back to the Inbox name for undiscovered inbox-prefixed project ids", () => {
    const task = normalizeMcpTask({ ...baseTask, projectId: "inbox125342" }, projectNames);
    expect(task.projectName).toBe(INBOX_PROJECT_NAME);
  });

  it("rejects tasks in unknown non-inbox projects", () => {
    expect(() => normalizeMcpTask({ ...baseTask, projectId: "project-unknown" }, projectNames)).toThrow(ProtocolError);
  });

  it("rejects tasks with missing identity or title", () => {
    expect(() => normalizeMcpTask({ ...baseTask, id: null }, projectNames)).toThrow(ProtocolError);
    expect(() => normalizeMcpTask({ ...baseTask, id: " " }, projectNames)).toThrow(ProtocolError);
    expect(() => normalizeMcpTask({ ...baseTask, projectId: null }, projectNames)).toThrow(ProtocolError);
    expect(() => normalizeMcpTask({ ...baseTask, title: null }, projectNames)).toThrow(ProtocolError);
    expect(() => normalizeMcpTask("task", projectNames)).toThrow(ProtocolError);
  });

  it("rejects malformed checklist items", () => {
    expect(() =>
      normalizeMcpTask({ ...baseTask, items: [{ title: "No identifier", status: 0 }] }, projectNames)
    ).toThrow(ProtocolError);
    expect(() => normalizeMcpTask({ ...baseTask, items: [{ id: "item-1", status: 0 }] }, projectNames)).toThrow(
      ProtocolError
    );
    expect(() => normalizeMcpTask({ ...baseTask, items: ["item-1"] }, projectNames)).toThrow(ProtocolError);
    expect(() => normalizeMcpTask({ ...baseTask, items: {} }, projectNames)).toThrow(ProtocolError);
  });
});

describe("normalizeMcpTaskStatus", () => {
  it("maps live integer statuses onto the domain states", () => {
    expect(normalizeMcpTaskStatus(0)).toBe("open");
    expect(normalizeMcpTaskStatus(undefined)).toBe("open");
    expect(normalizeMcpTaskStatus(null)).toBe("open");
    expect(normalizeMcpTaskStatus(2)).toBe("completed");
    expect(normalizeMcpTaskStatus(-1)).toBe("completed");
  });

  it("refuses statuses outside the verified contract", () => {
    expect(normalizeMcpTaskStatus(1)).toBeUndefined();
    expect(normalizeMcpTaskStatus(3)).toBeUndefined();
    expect(normalizeMcpTaskStatus("open")).toBeUndefined();
    expect(normalizeMcpTaskStatus("completed")).toBeUndefined();
  });
});

describe("normalizeMcpTaskList", () => {
  it("normalizes every entry of a task array", () => {
    const tasks = normalizeMcpTaskList(
      [
        { id: "task-1", projectId: "project-work", title: "First", status: 0 },
        { id: "task-2", projectId: "inbox125342", title: "Second", status: 2 },
      ],
      projectNames
    );

    expect(tasks.map((task) => [task.id, task.projectName, task.status])).toEqual([
      ["task-1", "Work", "open"],
      ["task-2", INBOX_PROJECT_NAME, "completed"],
    ]);
    expect(normalizeMcpTaskList([], projectNames)).toEqual([]);
  });

  it("rejects non-array payloads and malformed entries", () => {
    expect(() => normalizeMcpTaskList({ tasks: [] }, projectNames)).toThrow(ProtocolError);
    expect(() => normalizeMcpTaskList(undefined, projectNames)).toThrow(ProtocolError);
    expect(() => normalizeMcpTaskList([{ id: "task-1" }], projectNames)).toThrow(ProtocolError);
  });
});
