import { describe, expect, it, vi } from "vitest";
import { normalizeTimeEntry } from "./normalize";
import { makeApi, page, rawEntry } from "./testUtils";
import { TimeEntry } from "./types";
import { planEntry, restartEntry, startTimer, stopRunningTimers, toggleTimer, WorkflowContext } from "./workflows";

const conflict = {
  status: 409,
  body: {
    error: "running_timer_conflict",
    error_description: "A timer is already running.",
    running_entry: { id: "cmrunning" },
    running_entry_count: 1,
  },
};
const runningRaw = rawEntry({
  id: "cmrunning",
  is_running: true,
  notes: "Other work",
  task: { id: "cmt9", name: "Meetings" },
});
const startInput = { projectId: "cmproject0001", taskId: "cmtask0001", spentDate: "2026-10-15", notes: "New work" };

function ctx(api: WorkflowContext["api"], confirmReplace?: WorkflowContext["confirmReplace"]): WorkflowContext {
  return { api, userId: "cmuser0001", confirmReplace };
}

describe("startTimer", () => {
  it("creates a strict running timer without hours or replace_running", async () => {
    const { api, calls } = makeApi({
      "POST /api/v2/time_entries": { status: 201, body: rawEntry({ is_running: true }) },
    });
    const result = await startTimer(ctx(api), startInput);
    expect(result).toMatchObject({ status: "started", entry: { isRunning: true } });
    expect(calls[0].body).toEqual({
      project_id: "cmproject0001",
      task_id: "cmtask0001",
      spent_date: "2026-10-15",
      is_running: true,
      source: "api",
      notes: "New work",
    });
  });

  it("surfaces a running timer conflict when no confirmation is available", async () => {
    const { api, calls } = makeApi({ "POST /api/v2/time_entries": conflict });
    await expect(startTimer(ctx(api), startInput)).rejects.toMatchObject({
      kind: "running_timer_conflict",
      runningEntryId: "cmrunning",
    });
    expect(calls).toHaveLength(1);
  });

  it("asks before switching, then retries once with replace_running", async () => {
    const confirm = vi.fn(async (running: TimeEntry | undefined) => running?.taskName === "Meetings");
    const { api, calls } = makeApi({
      "POST /api/v2/time_entries": [conflict, { status: 201, body: rawEntry({ id: "cmnew", is_running: true }) }],
      "GET /api/v2/time_entries": page("time_entries", [runningRaw]),
    });
    const result = await startTimer(ctx(api, confirm), startInput);
    expect(result).toMatchObject({ status: "started", entry: { id: "cmnew" }, replaced: { id: "cmrunning" } });
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ id: "cmrunning", notes: "Other work" }));
    const posts = calls.filter((c) => c.method === "POST");
    expect(posts.map((c) => (c.body as { replace_running?: boolean }).replace_running)).toEqual([undefined, true]);
    const lookup = calls.find((c) => c.method === "GET")!;
    expect(lookup.url.searchParams.get("is_running")).toBe("true");
    expect(lookup.url.searchParams.get("user_id")).toBe("cmuser0001");
  });

  it("leaves the running timer alone when the user declines", async () => {
    const { api, calls } = makeApi({
      "POST /api/v2/time_entries": conflict,
      "GET /api/v2/time_entries": page("time_entries", [runningRaw]),
    });
    const result = await startTimer(
      ctx(api, async () => false),
      startInput,
    );
    expect(result).toMatchObject({ status: "cancelled", running: { id: "cmrunning" } });
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
  });

  it("copies only documented external reference fields", async () => {
    const { api, calls } = makeApi({
      "POST /api/v2/time_entries": { status: 201, body: rawEntry({ is_running: true }) },
    });
    await startTimer(ctx(api), {
      ...startInput,
      externalReference: {
        id: "ABC-1",
        permalink: "https://t.example/ABC-1",
        service: "t.example",
        serviceIconUrl: "https://icon",
      },
    });
    expect((calls[0].body as Record<string, unknown>).external_reference).toEqual({
      id: "ABC-1",
      permalink: "https://t.example/ABC-1",
      service: "t.example",
    });
  });
});

describe("restartEntry", () => {
  const stopped = normalizeTimeEntry(rawEntry());

  it("restarts without replace_running, and switches only after confirmation", async () => {
    const { api, calls } = makeApi({
      "PATCH /api/v2/time_entries/cmentry0001/restart": [conflict, { body: rawEntry({ is_running: true }) }],
      "GET /api/v2/time_entries": page("time_entries", [runningRaw]),
    });
    const result = await restartEntry(
      ctx(api, async () => true),
      stopped,
    );
    expect(result.status).toBe("started");
    const restarts = calls.filter((c) => c.url.pathname.endsWith("/restart"));
    expect(restarts.map((c) => c.body)).toEqual([undefined, { replace_running: true }]);
  });

  it("refuses approved or locked entries without calling Keito", async () => {
    const { api, calls } = makeApi({});
    const approved = normalizeTimeEntry(rawEntry({ approval_status: "approved", is_locked: true }));
    await expect(restartEntry(ctx(api), approved)).rejects.toMatchObject({ kind: "locked" });
    expect(calls).toHaveLength(0);
  });

  it("maps a server-side lock to a locked error", async () => {
    const { api } = makeApi({
      "PATCH /api/v2/time_entries/cmentry0001/restart": {
        status: 422,
        body: { error: "unprocessable_entity", error_description: "Time entry is locked by an approved timesheet" },
      },
    });
    await expect(restartEntry(ctx(api), stopped)).rejects.toMatchObject({
      kind: "locked",
      message: expect.stringMatching(/approved/),
    });
  });
});

describe("stop and toggle", () => {
  it("stops the running timer through PATCH /stop", async () => {
    const { api, calls } = makeApi({
      "GET /api/v2/time_entries": page("time_entries", [runningRaw]),
      "PATCH /api/v2/time_entries/cmrunning/stop": { body: { ...runningRaw, is_running: false } },
    });
    const stopped = await stopRunningTimers(ctx(api));
    expect(stopped.map((e) => e.id)).toEqual(["cmrunning"]);
    expect(calls.map((c) => `${c.method} ${c.url.pathname}`)).toEqual([
      "GET /api/v2/time_entries",
      "PATCH /api/v2/time_entries/cmrunning/stop",
    ]);
  });

  it("ignores entries that a server returns as stopped despite the is_running filter", async () => {
    const { api, calls } = makeApi({ "GET /api/v2/time_entries": page("time_entries", [rawEntry()]) });
    expect(await stopRunningTimers(ctx(api))).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it("toggle stops a running timer", async () => {
    const { api } = makeApi({
      "GET /api/v2/time_entries": page("time_entries", [runningRaw]),
      "PATCH /api/v2/time_entries/cmrunning/stop": { body: { ...runningRaw, is_running: false } },
    });
    expect(await toggleTimer(ctx(api), "2026-10-15")).toMatchObject({ action: "stopped", entry: { id: "cmrunning" } });
  });

  it("toggle restarts the most recently updated editable entry, skipping approved time", async () => {
    const { api, calls } = makeApi({
      "GET /api/v2/time_entries": [
        page("time_entries", []),
        page("time_entries", [
          rawEntry({ id: "old", updated_at: "2026-10-15T08:00:00Z" }),
          rawEntry({
            id: "approved",
            approval_status: "approved",
            is_locked: true,
            updated_at: "2026-10-15T12:00:00Z",
          }),
          rawEntry({ id: "recent", updated_at: "2026-10-15T11:00:00Z" }),
        ]),
      ],
      "PATCH /api/v2/time_entries/recent/restart": { body: rawEntry({ id: "recent", is_running: true }) },
    });
    expect(await toggleTimer(ctx(api), "2026-10-15")).toMatchObject({ action: "restarted", entry: { id: "recent" } });
    expect(calls[1].url.searchParams.get("from")).toBe("2026-10-15");
    expect(calls[2].body).toBeUndefined();
  });

  it("toggle never replaces a timer that started elsewhere meanwhile", async () => {
    const confirm = vi.fn(async () => true);
    const { api } = makeApi({
      "GET /api/v2/time_entries": [page("time_entries", []), page("time_entries", [rawEntry()])],
      "PATCH /api/v2/time_entries/cmentry0001/restart": conflict,
    });
    await expect(toggleTimer(ctx(api, confirm), "2026-10-15")).rejects.toMatchObject({
      kind: "running_timer_conflict",
    });
    expect(confirm).not.toHaveBeenCalled();
  });

  it("toggle reports when nothing can be restarted", async () => {
    const { api } = makeApi({
      "GET /api/v2/time_entries": [
        page("time_entries", []),
        page("time_entries", [rawEntry({ approval_status: "approved", is_locked: true })]),
      ],
    });
    expect(await toggleTimer(ctx(api), "2026-10-15")).toEqual({
      action: "none",
      reason: "Today's entries are locked or approved.",
    });
  });
});

describe("task/project context", () => {
  it("surfaces Keito's message when the task is not assigned to the project", async () => {
    const { api } = makeApi({
      "POST /api/v2/time_entries": {
        status: 422,
        body: { error: "invalid_task", error_description: "Task is not assigned to the selected project." },
      },
    });
    await expect(startTimer(ctx(api), startInput)).rejects.toMatchObject({
      kind: "validation",
      message: "Task is not assigned to the selected project.",
    });
  });

  it("explains an unassigned project", async () => {
    const { api } = makeApi({ "POST /api/v2/time_entries": { status: 403, body: { error: "project_not_assigned" } } });
    await expect(startTimer(ctx(api), startInput)).rejects.toMatchObject({
      kind: "forbidden",
      message: expect.stringMatching(/assigned to the project/),
    });
  });
});

describe("planEntry (entry form)", () => {
  const base = { projectId: "p", taskId: "t", spentDate: "2026-10-15", notes: "" };

  it("starts a timer for a blank duration and logs time for a duration", () => {
    expect(planEntry(base, { mode: "duration" })).toMatchObject({
      kind: "timer",
      input: { projectId: "p", taskId: "t" },
    });
    expect(planEntry({ ...base, duration: "1h30m", notes: "x" }, { mode: "duration" })).toEqual({
      kind: "create",
      body: { project_id: "p", task_id: "t", spent_date: "2026-10-15", source: "api", hours: 1.5, notes: "x" },
    });
    expect(planEntry({ ...base, duration: "20m" }, { mode: "duration" })).toMatchObject({ body: { hours: 0.3333 } });
  });

  it("validates project, task, and duration", () => {
    expect(planEntry({ ...base, projectId: null }, { mode: "duration" })).toMatchObject({
      kind: "error",
      field: "project",
    });
    expect(planEntry({ ...base, taskId: "" }, { mode: "duration" })).toMatchObject({ kind: "error", field: "task" });
    expect(planEntry({ ...base, duration: "soon" }, { mode: "duration" })).toMatchObject({
      kind: "error",
      field: "duration",
    });
  });

  it("uses HH:mm workspace times in start/end mode", () => {
    expect(planEntry({ ...base, startTime: "9:05am", endTime: "17:30" }, { mode: "start_end" })).toEqual({
      kind: "create",
      body: {
        project_id: "p",
        task_id: "t",
        spent_date: "2026-10-15",
        source: "api",
        started_time: "09:05",
        ended_time: "17:30",
      },
    });
    expect(planEntry({ ...base, startTime: "8" }, { mode: "start_end" })).toMatchObject({
      kind: "timer",
      input: { startedTime: "08:00" },
    });
    expect(planEntry(base, { mode: "start_end" })).toMatchObject({ kind: "timer", input: { startedTime: undefined } });
    expect(planEntry({ ...base, endTime: "5pm" }, { mode: "start_end" })).toMatchObject({
      kind: "error",
      field: "startTime",
    });
    expect(planEntry({ ...base, startTime: "5pm", endTime: "9am" }, { mode: "start_end" })).toMatchObject({
      field: "endTime",
    });
    expect(planEntry({ ...base, startTime: "25:00" }, { mode: "start_end" })).toMatchObject({ field: "startTime" });
  });

  it("sends only changed fields when editing, never duration for a running timer", () => {
    const existing = normalizeTimeEntry(
      rawEntry({ id: "e1", project: { id: "p", name: "P" }, task: { id: "t", name: "T" }, notes: "a", hours: 1.3333 }),
    );
    expect(planEntry({ ...base, notes: "a", duration: "1:20" }, { mode: "duration", existing })).toMatchObject({
      kind: "error",
      message: "No changes to save.",
    });
    expect(planEntry({ ...base, notes: "", duration: "2" }, { mode: "duration", existing })).toEqual({
      kind: "update",
      id: "e1",
      body: { notes: "", hours: 2 },
    });
    const running = { ...existing, isRunning: true };
    expect(
      planEntry({ ...base, taskId: "t2", notes: "a", duration: "5" }, { mode: "duration", existing: running }),
    ).toEqual({
      kind: "update",
      id: "e1",
      body: { task_id: "t2" },
    });
  });

  it("blocks edits to approved entries", () => {
    const approved = normalizeTimeEntry(rawEntry({ approval_status: "approved", is_locked: true }));
    expect(planEntry({ ...base, notes: "changed" }, { mode: "duration", existing: approved })).toMatchObject({
      kind: "error",
      field: "form",
      message: "Approved time cannot be changed.",
    });
  });
});
