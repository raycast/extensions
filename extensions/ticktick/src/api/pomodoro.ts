import { apiGet, apiPost } from "./client";
import { FocusRecord } from "../types/ticktick";
import { formatTickTickTime, startOfTodayMs, endOfTodayMs } from "../utils/time";

function genPomodoroId(): string {
  return `${Date.now()}${Math.random().toString(36).slice(2, 11)}`;
}

type PomodoroOp = "start" | "pause" | "continue" | "finish" | "drop";

interface PomodoroOpPayload {
  id: string;
  op: PomodoroOp;
  duration?: number;
  lastPoint?: number;
  focusOnId?: string;
  focusOnTitle?: string;
}

async function pomodoroOp(payload: PomodoroOpPayload): Promise<void> {
  await apiPost("/api/v2/pomodoro", [payload]);
}

export async function startTickTickPomodoro(options: {
  durationMinutes: number;
  taskId?: string;
  taskTitle?: string;
}): Promise<string> {
  const id = genPomodoroId();
  await pomodoroOp({
    id,
    op: "start",
    duration: options.durationMinutes,
    lastPoint: 0,
    ...(options.taskId && { focusOnId: options.taskId }),
    ...(options.taskTitle && { focusOnTitle: options.taskTitle }),
  });
  return id;
}

export async function pauseTickTickPomodoro(lastPoint: number): Promise<void> {
  await pomodoroOp({ id: genPomodoroId(), op: "pause", lastPoint });
}

export async function resumeTickTickPomodoro(lastPoint: number): Promise<void> {
  await pomodoroOp({ id: genPomodoroId(), op: "continue", lastPoint });
}

export async function finishTickTickPomodoro(lastPoint: number): Promise<void> {
  await pomodoroOp({ id: genPomodoroId(), op: "finish", lastPoint });
}

export async function dropTickTickPomodoro(lastPoint = 0): Promise<void> {
  await pomodoroOp({ id: genPomodoroId(), op: "drop", lastPoint });
}

interface TimerStateResponse {
  status?: string;
  duration?: number;
  lastPoint?: number;
  focusOnId?: string;
  focusOnTitle?: string;
}

export async function getTickTickTimerState(): Promise<TimerStateResponse | null> {
  try {
    return await apiGet<TimerStateResponse>("/api/v2/timer");
  } catch {
    return null;
  }
}

interface PomodoroTimelineResponse {
  pomo?: FocusRecord[];
  sw?: FocusRecord[];
}

/** Fetch today's completed pomodoro count from TickTick. */
export async function getTodayPomodoroCount(): Promise<number> {
  // Try V1 focus API first (OAuth-compatible)
  try {
    const from = formatTickTickTime(new Date(startOfTodayMs()));
    const to = formatTickTickTime(new Date(endOfTodayMs()));
    const records = await apiGet<FocusRecord[]>(
      `/open/v1/focus?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&type=0`,
    );
    return records?.length ?? 0;
  } catch {
    // Fall back to V2 timeline
  }

  try {
    const to = Date.now();
    const from = startOfTodayMs();
    const response = await apiGet<PomodoroTimelineResponse | FocusRecord[]>(
      `/api/v2/pomodoros/timeline?limit=50&to=${to}`,
    );
    const records = Array.isArray(response) ? response : [...(response?.pomo ?? []), ...(response?.sw ?? [])];
    return records.filter((r) => new Date(r.startTime).getTime() >= from).length;
  } catch {
    return 0;
  }
}

export async function getFocusRecords(limit = 30): Promise<FocusRecord[]> {
  try {
    const to = formatTickTickTime(new Date());
    const from = formatTickTickTime(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const records = await apiGet<FocusRecord[]>(
      `/open/v1/focus?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&type=0`,
    );
    return (records ?? []).slice(0, limit);
  } catch {
    // V2 fallback
  }

  const to = Date.now();
  const response = await apiGet<PomodoroTimelineResponse>(`/api/v2/pomodoros/timeline?limit=${limit}&to=${to}`);
  return [...(response?.pomo ?? []), ...(response?.sw ?? [])].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
  );
}

/** @deprecated Use lifecycle functions instead */
export async function saveFocusSession(record: {
  startTime: string;
  endTime: string;
  duration: number;
  taskId?: string;
  taskProjectId?: string;
}): Promise<void> {
  // Legacy batch endpoint — kept as fallback
  await apiPost("/api/v2/pomodoros", {
    pomo: [
      {
        startTime: record.startTime,
        endTime: record.endTime,
        duration: record.duration,
        pomodoroType: "pomo",
        ...(record.taskId && { taskId: record.taskId }),
        ...(record.taskProjectId && { taskProjectId: record.taskProjectId }),
      },
    ],
  });
}
