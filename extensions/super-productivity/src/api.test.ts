import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @raycast/api before importing api.ts
// vi.hoisted ensures mock fns are created before the mock factory runs
const mockShowToast = vi.hoisted(() => vi.fn());
const mockShowHUD = vi.hoisted(() => vi.fn());
const mockPreferences = vi.hoisted(() => ({
  apiBaseUrl: "http://test:3876",
  accessToken: "xXXxxxXXxXXXXXXxXXXxxXxxxxxXxXXX",
}));

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => mockPreferences,
  showToast: mockShowToast,
  showHUD: mockShowHUD,
  Toast: { Style: { Success: "success", Failure: "failure" } },
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import {
  checkHealth,
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  startTask,
  archiveTask,
  restoreTask,
  getStatus,
  getCurrentTask,
  setCurrentTask,
  stopCurrentTask,
  getProjects,
  getTags,
  createTag,
  updateTag,
  deleteTag,
} from "./api";

function okResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: () => Promise.resolve({ ok: true as const, data }),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function noContentResponse(status = 204) {
  return {
    ok: true,
    status,
    headers: new Headers(status === 204 ? undefined : { "content-length": "0" }),
    json: vi.fn(() => Promise.reject(new SyntaxError("Unexpected end of JSON input"))),
  };
}

function errorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    headers: new Headers(),
    json: () => Promise.resolve({ ok: false as const, error: { code: "ERR", message } }),
    text: () => Promise.resolve(message),
  };
}

function apiErrorResponse(message: string) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: () =>
      Promise.resolve({
        ok: false as const,
        error: { code: "API_ERR", message },
      }),
    text: () => Promise.resolve(message),
  };
}

beforeEach(() => {
  mockPreferences.apiBaseUrl = "http://test:3876";
  mockPreferences.accessToken = "xXXxxxXXxXXXXXXxXXXxxXxxxxxXxXXX";
  mockFetch.mockReset();
  mockShowToast.mockReset();
  mockShowHUD.mockReset();
});

describe("request authentication", () => {
  it("sends Authorization Bearer header when access token is set", async () => {
    mockFetch.mockResolvedValue(okResponse({ server: "SP", rendererReady: true }));

    await checkHealth();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://test:3876/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockPreferences.accessToken}`,
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("omits Authorization header when access token is empty", async () => {
    mockPreferences.accessToken = "";
    mockFetch.mockResolvedValue(okResponse({ server: "SP", rendererReady: true }));

    await checkHealth();

    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

describe("checkHealth", () => {
  it("returns health data on success", async () => {
    mockFetch.mockResolvedValue(okResponse({ server: "SP", rendererReady: true }));
    const result = await checkHealth();
    expect(result).toEqual({ server: "SP", rendererReady: true });
    expect(mockFetch).toHaveBeenCalledWith("http://test:3876/health", expect.any(Object));
  });
});

describe("getTasks", () => {
  it("calls /tasks with no params", async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await getTasks();
    expect(mockFetch).toHaveBeenCalledWith("http://test:3876/tasks", expect.any(Object));
  });

  it("normalizes whitespace and trailing slashes in the API base URL", async () => {
    mockPreferences.apiBaseUrl = "  http://test:3876///  ";
    mockFetch.mockResolvedValue(okResponse([]));

    await getTasks();

    expect(mockFetch).toHaveBeenCalledWith("http://test:3876/tasks", expect.any(Object));
  });

  it("applies query parameters", async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await getTasks({
      source: "active",
      projectId: "p1",
      tagId: "t1",
      query: "test",
      includeDone: true,
    });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("source=active");
    expect(url).toContain("projectId=p1");
    expect(url).toContain("tagId=t1");
    expect(url).toContain("query=test");
    expect(url).toContain("includeDone=true");
  });

  it("throws on non-ok HTTP status and shows toast", async () => {
    mockFetch.mockResolvedValue(errorResponse(500, "Server error"));
    await expect(getTasks()).rejects.toThrow("HTTP 500: Server error");
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ style: "failure", title: "API Error" }));
  });

  it("throws on API error response", async () => {
    mockFetch.mockResolvedValue(apiErrorResponse("Not found"));
    await expect(getTasks()).rejects.toThrow("Not found");
  });

  it("shows connection toast on network errors", async () => {
    mockFetch.mockRejectedValue(new Error("fetch failed"));
    await expect(getTasks()).rejects.toThrow("fetch failed");
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "Connection failed",
      }),
    );
  });
});

describe("getTask", () => {
  it("calls /tasks/:id", async () => {
    mockFetch.mockResolvedValue(okResponse({ id: "t1", title: "Test" }));
    const result = await getTask("t1");
    expect(result).toEqual({ id: "t1", title: "Test" });
    expect(mockFetch).toHaveBeenCalledWith("http://test:3876/tasks/t1", expect.any(Object));
  });
});

describe("createTask", () => {
  it("sends POST with payload", async () => {
    mockFetch.mockResolvedValue(okResponse({ id: "new", title: "New Task" }));
    const result = await createTask({
      title: "New Task",
      timeEstimate: 3600000,
    });
    expect(result.title).toBe("New Task");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test:3876/tasks",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("New Task"),
      }),
    );
  });
});

describe("updateTask", () => {
  it("sends PATCH with partial payload", async () => {
    mockFetch.mockResolvedValue(okResponse({ id: "t1", title: "Updated", isDone: true }));
    const result = await updateTask("t1", { isDone: true });
    expect(result.isDone).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test:3876/tasks/t1",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
  });
});

describe("deleteTask", () => {
  it("sends DELETE request", async () => {
    mockFetch.mockResolvedValue(okResponse(null));
    await deleteTask("t1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test:3876/tasks/t1",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  it("accepts a 204 response without parsing JSON", async () => {
    const response = noContentResponse();
    mockFetch.mockResolvedValue(response);

    await expect(deleteTask("t1")).resolves.toBeUndefined();

    expect(response.json).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("accepts an empty response declared by content-length", async () => {
    const response = noContentResponse(200);
    mockFetch.mockResolvedValue(response);

    await expect(deleteTask("t1")).resolves.toBeUndefined();

    expect(response.json).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });
});

describe("startTask", () => {
  it("sends POST to /tasks/:id/start", async () => {
    mockFetch.mockResolvedValue(okResponse(null));
    await startTask("t1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test:3876/tasks/t1/start",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});

describe("archiveTask", () => {
  it("sends POST to /tasks/:id/archive", async () => {
    mockFetch.mockResolvedValue(okResponse(null));
    await archiveTask("t1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test:3876/tasks/t1/archive",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});

describe("restoreTask", () => {
  it("sends POST to /tasks/:id/restore", async () => {
    mockFetch.mockResolvedValue(okResponse(null));
    await restoreTask("t1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test:3876/tasks/t1/restore",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});

describe("getStatus", () => {
  it("returns status data", async () => {
    mockFetch.mockResolvedValue(okResponse({ currentTask: null, currentTaskId: null, taskCount: 5 }));
    const result = await getStatus();
    expect(result.taskCount).toBe(5);
    expect(mockFetch).toHaveBeenCalledWith("http://test:3876/status", expect.any(Object));
  });
});

describe("getCurrentTask", () => {
  it("returns current task or null", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        id: "t1",
        title: "Current",
        timeSpentOnDay: { "2026-06-16": 0 },
        timeSpent: 0,
        isDone: false,
      }),
    );
    const result = await getCurrentTask();
    expect(result?.id).toBe("t1");
    expect(mockFetch).toHaveBeenCalledWith("http://test:3876/task-control/current", expect.any(Object));
  });
});

describe("setCurrentTask", () => {
  it("sends POST with taskId", async () => {
    mockFetch.mockResolvedValue(okResponse(null));
    await setCurrentTask("t1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test:3876/task-control/current",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("t1"),
      }),
    );
  });

  it("sends POST with null to stop", async () => {
    mockFetch.mockResolvedValue(okResponse(null));
    await setCurrentTask(null);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.taskId).toBeNull();
  });
});

describe("stopCurrentTask", () => {
  it("sends POST to /task-control/stop", async () => {
    mockFetch.mockResolvedValue(okResponse(null));
    await stopCurrentTask();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test:3876/task-control/stop",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});

describe("getProjects", () => {
  it("calls /projects", async () => {
    mockFetch.mockResolvedValue(okResponse([{ id: "p1", title: "Work" }]));
    const result = await getProjects();
    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith("http://test:3876/projects", expect.any(Object));
  });

  it("applies query parameter", async () => {
    mockFetch.mockResolvedValue(okResponse([]));
    await getProjects("work");
    expect(mockFetch).toHaveBeenCalledWith("http://test:3876/projects?query=work", expect.any(Object));
  });
});

describe("getTags", () => {
  it("calls /tags", async () => {
    mockFetch.mockResolvedValue(okResponse([{ id: "t1", title: "urgent" }]));
    const result = await getTags();
    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith("http://test:3876/tags", expect.any(Object));
  });
});

describe("createTag", () => {
  it("sends POST with tag payload", async () => {
    mockFetch.mockResolvedValue(okResponse({ id: "new", title: "urgent", color: "red" }));
    const result = await createTag({ title: "urgent", color: "red" });
    expect(result.title).toBe("urgent");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test:3876/tags",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});

describe("updateTag", () => {
  it("sends PATCH with partial payload", async () => {
    mockFetch.mockResolvedValue(okResponse({ id: "t1", title: "renamed" }));
    const result = await updateTag("t1", { title: "renamed" });
    expect(result.title).toBe("renamed");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test:3876/tags/t1",
      expect.objectContaining({
        method: "PATCH",
      }),
    );
  });
});

describe("deleteTag", () => {
  it("sends DELETE request", async () => {
    mockFetch.mockResolvedValue(okResponse(null));
    await deleteTag("t1");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test:3876/tags/t1",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});
