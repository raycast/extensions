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

export async function pauseTickTickPomodoro(id: string, lastPoint: number): Promise<void> {
  await pomodoroOp({ id, op: "pause", lastPoint });
}

export async function resumeTickTickPomodoro(id: string, lastPoint: number): Promise<void> {
  await pomodoroOp({ id, op: "continue", lastPoint });
}

export async function finishTickTickPomodoro(id: string, lastPoint: number): Promise<void> {
  await pomodoroOp({ id, op: "finish", lastPoint });
}

export async function dropTickTickPomodoro(id: string, lastPoint = 0): Promise<void> {
  await pomodoroOp({ id, op: "drop", lastPoint });
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
      { wipeTokenOn401: false },
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
