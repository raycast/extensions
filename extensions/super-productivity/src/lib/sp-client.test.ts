import { afterEach, describe, expect, it, vi } from "vitest";
import {
  archiveTask,
  createTask,
  getTask,
  listTasks,
  restoreTask,
  setCurrentTask,
  updateTask,
} from "./sp-client";
import { SpApiError } from "./sp-errors";

const mockFetch = (handler: (url: string, init?: RequestInit) => unknown) => {
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    return handler(String(url), init) as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("sp-client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serializes task list filters including TODAY and all sources", async () => {
    const fetchMock = mockFetch((url) => {
      expect(url).toBe(
        "http://127.0.0.1:3876/tasks?query=deep+work&tagId=TODAY&includeDone=true&source=all",
      );
      return jsonResponse({ ok: true, data: [] });
    });

    await expect(
      listTasks({
        query: "deep work",
        tagId: "TODAY",
        includeDone: true,
        source: "all",
      }),
    ).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("creates subtasks without project or tag fields", async () => {
    const fetchMock = mockFetch((_url, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        title: "Follow up",
        parentId: "parent-1",
      });
      return jsonResponse({
        ok: true,
        data: { id: "task-1", title: "Follow up", isDone: false },
      });
    });

    await createTask({
      title: " Follow up ",
      parentId: "parent-1",
      projectId: "project-1",
      tagIds: ["tag-1"],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3876/tasks",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("updates tasks with only supported fields", async () => {
    mockFetch((_url, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        title: "Renamed",
        isDone: true,
      });
      return jsonResponse({
        ok: true,
        data: { id: "task-1", title: "Renamed", isDone: true },
      });
    });

    await updateTask("task-1", {
      title: " Renamed ",
      isDone: true,
      tagIds: [],
      notes: "",
    });
  });

  it("calls get, set-current, archive, and restore endpoints", async () => {
    const calls: string[] = [];
    mockFetch((url, init) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      return jsonResponse({ ok: true, data: { ok: true } });
    });

    await getTask("task-1");
    await setCurrentTask("task-1");
    await setCurrentTask(null);
    await archiveTask("task-1");
    await restoreTask("task-1");

    expect(calls).toEqual([
      "GET http://127.0.0.1:3876/tasks/task-1",
      "POST http://127.0.0.1:3876/task-control/current",
      "POST http://127.0.0.1:3876/task-control/current",
      "POST http://127.0.0.1:3876/tasks/task-1/archive",
      "POST http://127.0.0.1:3876/tasks/task-1/restore",
    ]);
  });

  it("throws API errors from the REST envelope", async () => {
    mockFetch(() =>
      jsonResponse(
        {
          ok: false,
          error: {
            code: "TASK_NOT_FOUND",
            message: "Task not found",
            details: { id: "missing" },
          },
        },
        404,
      ),
    );

    await expect(getTask("missing")).rejects.toMatchObject<Partial<SpApiError>>(
      {
        name: "SpApiError",
        code: "TASK_NOT_FOUND",
        status: 404,
        details: { id: "missing" },
      },
    );
  });
});
