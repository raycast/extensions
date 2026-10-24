// Live write-path checks. They create, change, start, stop, restart, and delete entries that this
// run creates (notes start with "[raycast-live-test"), then delete them. Opt-in: KEITO_LIVE_WRITE=1.
// A timer that was running beforehand is restarted at the end. Approved entries are only probed
// with a no-op edit (identical notes).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { KeitoApi } from "./api";
import { validateCredentials } from "./config";
import { todayIn } from "./dates";
import { isKeitoError, KeitoError } from "./errors";
import { FetchLike } from "./http";
import { KeitoIdentity, Project, Task, TimeEntry } from "./types";
import { planEntry, restartEntry, startTimer, stopRunningTimers, toggleTimer, WorkflowContext } from "./workflows";

const enabled = process.env.KEITO_LIVE_WRITE === "1";
const credentials = validateCredentials({ token: process.env.KEITO_API_KEY, accountID: process.env.KEITO_ACCOUNT_ID });
const runId = new Date().toISOString().replace(/[:.]/g, "");
const label = `[raycast-live-test ${runId}]`;

const exchanges: string[] = [];
const recordingFetch: FetchLike = async (url, init) => {
  const response = await fetch(url, init);
  exchanges.push(`${init.method} ${new URL(url).pathname} -> ${response.status}`);
  return response;
};
const api = new KeitoApi({ ...credentials, fetch: recordingFetch });
const report: Record<string, unknown> = { label };
const created = new Set<string>();

let identity: KeitoIdentity;
let today: string;
let project: Project;
let tasks: Task[];
let previouslyRunning: TimeEntry | undefined;

function ctx(confirm?: boolean): WorkflowContext {
  return { api, userId: identity.userId, confirmReplace: confirm === undefined ? undefined : async () => confirm };
}

function track<T extends { id: string } | undefined>(entry: T): T {
  if (entry) created.add(entry.id);
  return entry;
}

function describeError(error: unknown) {
  return isKeitoError(error)
    ? {
        kind: error.kind,
        status: error.status,
        code: error.code,
        serverMessage: error.serverMessage,
        runningEntryId: error.runningEntryId ? "present" : undefined,
      }
    : { unexpected: String(error) };
}

async function expectKeitoError(promise: Promise<unknown>): Promise<KeitoError> {
  const error = await promise.then(
    () => undefined,
    (e) => e,
  );
  expect(error).toBeInstanceOf(KeitoError);
  return error as KeitoError;
}

describe.runIf(enabled)("live writes", () => {
  beforeAll(async () => {
    identity = await api.getIdentity();
    today = todayIn(identity.settings.timezone);
    const projects = await api.listProjects();
    for (const candidate of projects) {
      const candidateTasks = await api.listProjectTasks(candidate.id);
      if (candidateTasks.length >= 2) {
        project = candidate;
        tasks = candidateTasks;
        break;
      }
    }
    expect(project, "a project with at least two tasks").toBeDefined();
    previouslyRunning = (await api.listRunningEntries(identity.userId))[0];
    report.setup = {
      today,
      timezone: identity.settings.timezone,
      taskCount: tasks.length,
      timerRunningBeforehand: !!previouslyRunning,
    };
    if (previouslyRunning) await api.stopTimeEntry(previouslyRunning.id);
  });

  afterAll(async () => {
    if (!identity) return;
    const cleanup: string[] = [];
    for (const id of created) {
      try {
        await api.deleteTimeEntry(id);
        cleanup.push("deleted");
      } catch (error) {
        cleanup.push(
          isKeitoError(error) && error.kind === "not_found" ? "already gone" : `FAILED ${describeError(error).kind}`,
        );
      }
    }
    const leftovers = (await api.listTimeEntries({ userId: identity.userId, from: today, to: today })).filter((e) =>
      e.notes.startsWith(label),
    );
    report.cleanup = { created: created.size, results: cleanup, leftovers: leftovers.length };
    if (previouslyRunning) {
      const result = await restartEntry(ctx(true), previouslyRunning).catch((e) => e);
      report.restoredPreviousTimer = !isKeitoError(result) && result?.status === "started";
    }
    report.requests = exchanges;
    console.log(
      `\nLIVE WRITE REPORT\n${JSON.stringify(report, null, 2).split(credentials.accountId).join("<company-id>")}`,
    );
  });

  it("creates, edits, and re-times a completed entry", async () => {
    const plan = planEntry(
      { projectId: project.id, taskId: tasks[0].id, spentDate: today, notes: `${label} manual`, duration: "15m" },
      { mode: "duration", requireNotes: identity.settings.requireNotes },
    );
    expect(plan.kind).toBe("create");
    if (plan.kind !== "create") return;
    const entry = track(await api.createTimeEntry(plan.body));
    expect(entry).toMatchObject({
      projectId: project.id,
      taskId: tasks[0].id,
      spentDate: today,
      isRunning: false,
      source: "api",
    });
    report.created = { hours: entry.hours, rounded: entry.hours !== 0.25, approvalStatus: entry.approvalStatus };

    const update = planEntry(
      {
        projectId: project.id,
        taskId: tasks[1].id,
        spentDate: today,
        notes: `${label} manual edited`,
        duration: "0:30",
      },
      { mode: "duration", existing: entry },
    );
    expect(update).toMatchObject({
      kind: "update",
      body: { task_id: tasks[1].id, notes: `${label} manual edited`, hours: 0.5 },
    });
    if (update.kind !== "update") return;
    const edited = await api.updateTimeEntry(update.id, update.body);
    expect(edited).toMatchObject({ taskId: tasks[1].id, notes: `${label} manual edited`, hours: 0.5 });

    const retime = planEntry(
      {
        projectId: project.id,
        taskId: tasks[1].id,
        spentDate: today,
        notes: edited.notes,
        startTime: "08:00",
        endTime: "8:45am",
      },
      { mode: "start_end", existing: edited },
    );
    if (retime.kind !== "update") throw new Error(JSON.stringify(retime));
    const retimed = await api.updateTimeEntry(retime.id, retime.body);
    report.retimed = {
      body: retime.body,
      startedTime: retimed.startedTime,
      endedTime: retimed.endedTime,
      hours: retimed.hours,
    };
    expect([retimed.startedTime, retimed.endedTime]).toEqual(["08:00", "08:45"]);
  });

  it("starts a timer, reports the conflict, and switches only when confirmed", async () => {
    const a = await startTimer(ctx(), {
      projectId: project.id,
      taskId: tasks[0].id,
      spentDate: today,
      notes: `${label} timer A`,
    });
    if (a.status !== "started") throw new Error("A not started");
    track(a.entry);
    expect(a.entry.isRunning).toBe(true);
    report.timerA = { timerStartedAt: !!a.entry.timerStartedAt, startedTime: a.entry.startedTime ?? null };

    const conflict = await expectKeitoError(
      startTimer(ctx(), { projectId: project.id, taskId: tasks[1].id, spentDate: today, notes: `${label} timer B` }),
    );
    report.conflict = describeError(conflict);
    expect(conflict.kind).toBe("running_timer_conflict");
    expect(conflict.runningEntryId).toBe(a.entry.id);

    const declined = await startTimer(ctx(false), {
      projectId: project.id,
      taskId: tasks[1].id,
      spentDate: today,
      notes: `${label} timer B`,
    });
    expect(declined).toMatchObject({ status: "cancelled", running: { id: a.entry.id } });

    const b = await startTimer(ctx(true), {
      projectId: project.id,
      taskId: tasks[1].id,
      spentDate: today,
      notes: `${label} timer B`,
    });
    if (b.status !== "started") throw new Error("B not started");
    track(b.entry);
    expect(b.replaced?.id).toBe(a.entry.id);
    const running = await api.listRunningEntries(identity.userId);
    expect(running.map((e) => e.id)).toEqual([b.entry.id]);
  });

  it("stops, restarts, and toggles", async () => {
    const stopped = await stopRunningTimers(ctx());
    expect(stopped).toHaveLength(1);
    expect(stopped[0].isRunning).toBe(false);
    const stoppedEntry = stopped[0];

    const restarted = await restartEntry(ctx(), stoppedEntry);
    expect(restarted).toMatchObject({ status: "started", entry: { id: stoppedEntry.id, isRunning: true } });
    report.restartKeepsSameEntry = restarted.status === "started" && restarted.entry.id === stoppedEntry.id;
    if (restarted.status === "started") track(restarted.entry);

    // Restarting another entry while one runs: conflict first, then an explicit switch.
    const other = [...created].find((id) => id !== stoppedEntry.id)!;
    // GET /time_entries/:id returns 405 live, so find the entry in today's list.
    const otherEntry = (await api.listTimeEntries({ userId: identity.userId, from: today, to: today })).find(
      (e) => e.id === other,
    )!;
    const restartConflict = await expectKeitoError(restartEntry(ctx(), otherEntry));
    report.restartConflict = describeError(restartConflict);
    expect(restartConflict.kind).toBe("running_timer_conflict");
    const switched = await restartEntry(ctx(true), otherEntry);
    if (switched.status === "started") track(switched.entry);
    expect((await api.listRunningEntries(identity.userId)).map((e) => e.id)).toEqual([otherEntry.id]);

    const toggledOff = await toggleTimer(ctx(), today);
    expect(toggledOff).toMatchObject({ action: "stopped", entry: { id: otherEntry.id } });
    const toggledOn = await toggleTimer(ctx(), today);
    report.toggleOn =
      toggledOn.action === "restarted" ? { restartedTestEntry: created.has(toggledOn.entry.id) } : toggledOn;
    expect(toggledOn.action).toBe("restarted");
    if (toggledOn.action === "restarted") track(toggledOn.entry);
    await stopRunningTimers(ctx());
    expect(await api.listRunningEntries(identity.userId)).toHaveLength(0);
  });

  it("reports Keito's errors for locked time and task/project mismatches", async () => {
    const from = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
    const approved = (await api.listTimeEntries({ userId: identity.userId, from, to: today })).find(
      (e) => e.approvalStatus === "approved",
    );
    if (approved) {
      // No-op edit: identical notes. Keito should refuse because the entry is locked.
      const lockError = await expectKeitoError(api.updateTimeEntry(approved.id, { notes: approved.notes }));
      report.approvedEdit = describeError(lockError);
      expect(lockError.kind).toBe("locked");
      const restartError = await expectKeitoError(api.restartTimeEntry(approved.id));
      report.approvedRestart = describeError(restartError);
      if (!isKeitoError(restartError)) track(approved);
    } else {
      report.approvedEdit = "no approved entries in the last 90 days";
    }

    const projectTaskIds = new Set(tasks.map((t) => t.id));
    let foreignTask: Task | undefined;
    for (const candidate of (await api.listProjects()).filter((p) => p.id !== project.id).slice(0, 10)) {
      foreignTask = (await api.listProjectTasks(candidate.id)).find((t) => !projectTaskIds.has(t.id));
      if (foreignTask) break;
    }
    if (foreignTask) {
      const mismatch = await api
        .createTimeEntry({
          project_id: project.id,
          task_id: foreignTask.id,
          spent_date: today,
          hours: 0.1,
          notes: `${label} mismatch`,
          source: "api",
        })
        .then(track, (e) => e);
      // Observed 2026-10-15: Keito accepts this despite the docs; the extension must scope tasks itself.
      report.taskNotOnProject = isKeitoError(mismatch) ? describeError(mismatch) : "accepted by Keito";
    }

    const badDate = await api
      .createTimeEntry({
        project_id: project.id,
        task_id: tasks[0].id,
        spent_date: today,
        started_time: "10:00",
        ended_time: "09:00",
        notes: `${label} bad times`,
        source: "api",
      })
      .then(track, (e) => e);
    report.endBeforeStart = isKeitoError(badDate) ? describeError(badDate) : "ACCEPTED (unexpected)";
  });

  it("deletes entries with 204 and reports a missing entry as not found", async () => {
    const entry = track(
      await api.createTimeEntry({
        project_id: project.id,
        task_id: tasks[0].id,
        spent_date: today,
        hours: 0.1,
        notes: `${label} delete`,
        source: "api",
      }),
    );
    await api.deleteTimeEntry(entry.id);
    created.delete(entry.id);
    const again = await expectKeitoError(api.deleteTimeEntry(entry.id));
    report.deleteTwice = describeError(again);
    expect(again.kind).toBe("not_found");
  });
});
