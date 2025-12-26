import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { exec } from "node:child_process";

// macOS system sounds for notifications
export const SOUNDS = {
  focusComplete: "/System/Library/Sounds/Glass.aiff",
  breakComplete: "/System/Library/Sounds/Hero.aiff",
  pomodoroComplete: "/System/Library/Sounds/Funk.aiff",
} as const;

export function playSound(soundPath: string): void {
  exec(`afplay "${soundPath}"`, (error) => {
    if (error) {
      console.error("Failed to play sound:", error);
    }
  });
}

export const STORAGE_KEYS = {
  ACTIVE: "better-time-log/active-timer",
  HISTORY: "better-time-log/history",
};

export const MAX_HISTORY_ITEMS = 20;

export type TimerMode = "open" | "pomodoro";
export type TimerPhase = "focus" | "break";

export interface PomodoroState {
  focusDurationMs: number;
  breakDurationMs: number;
  cycles: number;
  completedFocusBlocks: number;
  phase: TimerPhase;
}

export interface ActiveTimer {
  id: string;
  title: string;
  project?: string;
  tags?: string[];
  createdAt: number;
  startedAt: number;
  mode: TimerMode;
  targetDurationMs?: number;
  pomodoro?: PomodoroState;
  // Pause/Resume support
  isPaused?: boolean;
  pausedAt?: number;
  sessionPausedMs?: number;
  phasePausedMs?: number;
}

export interface SessionLog {
  id: string;
  title: string;
  project?: string;
  tags?: string[];
  startedAt: number;
  endedAt: number;
  durationMs: number;
  mode: TimerMode;
  pomodoroCycles?: number;
}

export interface StartTimerPayload {
  title?: string;
  project?: string;
  tags?: string[];
  mode: TimerMode;
  targetDurationMinutes?: number;
  pomodoro?: {
    focusMinutes: number;
    breakMinutes: number;
    cycles: number;
  };
}

export async function getActiveTimer(): Promise<ActiveTimer | null> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.ACTIVE);
  if (!raw) {
    return null;
  }
  const parsed = safeParse<ActiveTimer>(raw);
  if (!parsed) {
    await LocalStorage.removeItem(STORAGE_KEYS.ACTIVE);
  }
  return parsed;
}

export async function setActiveTimer(timer: ActiveTimer | null): Promise<void> {
  if (timer) {
    await LocalStorage.setItem(STORAGE_KEYS.ACTIVE, JSON.stringify(timer));
  } else {
    await LocalStorage.removeItem(STORAGE_KEYS.ACTIVE);
  }
}

export async function getHistory(): Promise<SessionLog[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.HISTORY);
  if (!raw) {
    return [];
  }
  const parsed = safeParse<SessionLog[]>(raw);
  if (!parsed) {
    await LocalStorage.removeItem(STORAGE_KEYS.HISTORY);
    return [];
  }
  return parsed;
}

export async function setHistory(history: SessionLog[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

export async function updateSessionProject(
  sessionId: string,
  project?: string,
  tags?: string[],
): Promise<SessionLog[]> {
  const history = await getHistory();
  const index = history.findIndex((s) => s.id === sessionId);
  if (index === -1) {
    throw new Error("SESSION_NOT_FOUND");
  }
  history[index] = {
    ...history[index],
    project: sanitizeProject(project),
    tags: sanitizeTags(tags),
  };
  await setHistory(history);
  return history;
}

export async function deleteSession(sessionId: string): Promise<SessionLog[]> {
  const history = await getHistory();
  const filtered = history.filter((s) => s.id !== sessionId);
  if (filtered.length === history.length) {
    throw new Error("SESSION_NOT_FOUND");
  }
  await setHistory(filtered);
  return filtered;
}

export async function assignProjectToActiveTimer(project?: string): Promise<ActiveTimer> {
  const timer = await getActiveTimer();
  if (!timer) {
    throw new Error("NO_ACTIVE_TIMER");
  }
  const updated: ActiveTimer = {
    ...timer,
    project: sanitizeProject(project),
  };
  await setActiveTimer(updated);
  return updated;
}

export async function cancelActiveTimer(): Promise<void> {
  await setActiveTimer(null);
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

export function formatReadableDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function buildSummary(entry: SessionLog): string {
  const project = entry.project ? ` · ${entry.project}` : "";
  const label = entry.mode === "pomodoro" ? "Pomodoro" : "Timer";
  const cycles =
    entry.mode === "pomodoro" && entry.pomodoroCycles !== undefined ? ` (${entry.pomodoroCycles} focus blocks)` : "";
  return `${label}${cycles}${project}: ${formatReadableDuration(entry.durationMs)}`;
}

export function buildSessionLog(timer: ActiveTimer, endedAt: number): SessionLog {
  return {
    id: `${timer.id}-${endedAt}`,
    title: timer.title,
    project: timer.project,
    tags: timer.tags,
    startedAt: timer.createdAt,
    endedAt,
    durationMs: Math.max(0, endedAt - timer.createdAt - (timer.sessionPausedMs ?? 0)),
    mode: timer.mode,
    pomodoroCycles: timer.pomodoro?.completedFocusBlocks,
  };
}

export async function startTimer(payload: StartTimerPayload): Promise<ActiveTimer> {
  const existing = await getActiveTimer();
  if (existing) {
    throw new Error("ACTIVE_TIMER_EXISTS");
  }
  const timer = createActiveTimer(payload);
  await setActiveTimer(timer);
  return timer;
}

export async function stopTimer(
  existingTimer?: ActiveTimer | null,
  historyOverride?: SessionLog[],
): Promise<{ entry: SessionLog; history: SessionLog[] }> {
  const timer = existingTimer ?? (await getActiveTimer());
  if (!timer) {
    throw new Error("NO_ACTIVE_TIMER");
  }
  const currentHistory = historyOverride ?? (await getHistory());
  const entry = buildSessionLog(timer, Date.now());
  const history = [entry, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
  await Promise.all([setActiveTimer(null), setHistory(history)]);
  return { entry, history };
}

export function listProjects(history: SessionLog[]): string[] {
  const items = new Set(history.map((entry) => entry.project).filter(Boolean) as string[]);
  return Array.from(items).sort((a, b) => a.localeCompare(b));
}

export function createActiveTimer(payload: StartTimerPayload): ActiveTimer {
  const now = Date.now();
  const title = sanitizeTitle(payload.title, payload.mode);
  const project = sanitizeProject(payload.project);
  const tags = sanitizeTags(payload.tags);

  const timer: ActiveTimer = {
    id: randomUUID(),
    title,
    project,
    tags,
    createdAt: now,
    startedAt: now,
    mode: payload.mode,
    isPaused: false,
    pausedAt: undefined,
    sessionPausedMs: 0,
    phasePausedMs: 0,
  };

  if (payload.mode === "open" && payload.targetDurationMinutes) {
    timer.targetDurationMs = Math.round(payload.targetDurationMinutes * 60 * 1000);
  }

  if (payload.mode === "pomodoro" && payload.pomodoro) {
    timer.pomodoro = {
      focusDurationMs: payload.pomodoro.focusMinutes * 60 * 1000,
      breakDurationMs: payload.pomodoro.breakMinutes * 60 * 1000,
      cycles: payload.pomodoro.cycles,
      completedFocusBlocks: 0,
      phase: "focus",
    };
  }

  return timer;
}

export function safeParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function pauseActiveTimer(): Promise<ActiveTimer> {
  const timer = await getActiveTimer();
  if (!timer) {
    throw new Error("NO_ACTIVE_TIMER");
  }
  if (timer.isPaused) {
    throw new Error("ALREADY_PAUSED");
  }
  const updated: ActiveTimer = { ...timer, isPaused: true, pausedAt: Date.now() };
  await setActiveTimer(updated);
  return updated;
}

export async function resumeActiveTimer(): Promise<ActiveTimer> {
  const timer = await getActiveTimer();
  if (!timer) {
    throw new Error("NO_ACTIVE_TIMER");
  }
  if (!timer.isPaused || !timer.pausedAt) {
    throw new Error("NOT_PAUSED");
  }
  const delta = Date.now() - timer.pausedAt;
  const updated: ActiveTimer = {
    ...timer,
    isPaused: false,
    pausedAt: undefined,
    sessionPausedMs: (timer.sessionPausedMs ?? 0) + delta,
    phasePausedMs: (timer.phasePausedMs ?? 0) + delta,
  };
  await setActiveTimer(updated);
  return updated;
}

// Project Appearance (emoji/color)
export interface ProjectMeta {
  emoji?: string;
  color?: string; // Raycast Color name or hex
}

export async function getProjectMetaMap(): Promise<Record<string, ProjectMeta>> {
  const raw = await LocalStorage.getItem<string>(`${STORAGE_KEYS.HISTORY}-project-meta`);
  if (!raw) return {};
  const parsed = safeParse<Record<string, ProjectMeta>>(raw);
  return parsed ?? {};
}

export async function setProjectMeta(project: string, meta: ProjectMeta): Promise<void> {
  const map = await getProjectMetaMap();
  map[project] = { ...map[project], ...meta };
  await LocalStorage.setItem(`${STORAGE_KEYS.HISTORY}-project-meta`, JSON.stringify(map));
}

export async function getProjectMeta(project?: string): Promise<ProjectMeta | undefined> {
  if (!project) return undefined;
  const map = await getProjectMetaMap();
  return map[project];
}

function sanitizeTitle(title: string | undefined, mode: TimerMode): string {
  const fallback = mode === "pomodoro" ? "Pomodoro" : "Working Session";
  return (title?.trim() || fallback).slice(0, 60);
}

export function sanitizeProject(project?: string): string | undefined {
  const trimmed = project?.trim();
  return trimmed ? trimmed.slice(0, 60) : undefined;
}

export function sanitizeTags(tags?: string[]): string[] | undefined {
  if (!tags || tags.length === 0) return undefined;

  const cleaned = tags
    .map((tag) => {
      const trimmed = tag.trim().toLowerCase();
      // Ensure tag starts with # and is cleaned
      const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
      return normalized.slice(0, 30);
    })
    .filter((tag) => tag.length > 1); // Must have more than just #

  // Remove duplicates and limit to 10 tags
  const unique = [...new Set(cleaned)].slice(0, 10);
  return unique.length > 0 ? unique : undefined;
}

export function listTags(history: SessionLog[]): string[] {
  const allTags = history.flatMap((entry) => entry.tags || []);
  const unique = new Set(allTags);
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

// Pomodoro phase advancement result
export interface PomodoroAdvanceResult {
  action: "completed" | "to-break" | "to-focus";
  timer: ActiveTimer | null; // null when completed
  message: string;
  subtitle?: string;
}

/**
 * Advance the Pomodoro to the next phase.
 * - If in focus phase: increment completed blocks, switch to break or complete if last
 * - If in break phase: switch back to focus
 * Persists the updated timer state automatically.
 */
export async function advancePomodoroPhase(
  timer: ActiveTimer,
  options?: { skip?: boolean; playSound?: boolean },
): Promise<PomodoroAdvanceResult> {
  if (!timer.pomodoro) {
    throw new Error("NOT_A_POMODORO");
  }

  const pomodoro = timer.pomodoro;
  const now = Date.now();
  const shouldPlaySound = options?.playSound !== false && !options?.skip;

  if (pomodoro.phase === "focus") {
    const completedFocusBlocks = pomodoro.completedFocusBlocks + 1;
    const isLastFocus = completedFocusBlocks >= pomodoro.cycles;

    if (isLastFocus) {
      // Pomodoro session complete - log and clear
      const finishedTimer: ActiveTimer = {
        ...timer,
        pomodoro: { ...pomodoro, completedFocusBlocks },
      };
      await stopTimer(finishedTimer);
      if (shouldPlaySound) {
        playSound(SOUNDS.pomodoroComplete);
      }
      return {
        action: "completed",
        timer: null,
        message: options?.skip ? "Focus skipped" : "Pomodoro complete",
        subtitle: "Time to celebrate!",
      };
    }

    // Switch to break
    const updated: ActiveTimer = {
      ...timer,
      startedAt: now,
      phasePausedMs: 0,
      pomodoro: { ...pomodoro, completedFocusBlocks, phase: "break" },
    };
    await setActiveTimer(updated);
    if (shouldPlaySound) {
      playSound(SOUNDS.focusComplete);
    }
    return {
      action: "to-break",
      timer: updated,
      message: options?.skip ? "Skipped to break" : "Focus complete",
      subtitle: "Break started",
    };
  }

  // Break phase -> switch to focus
  const updated: ActiveTimer = {
    ...timer,
    startedAt: now,
    phasePausedMs: 0,
    pomodoro: { ...pomodoro, phase: "focus" },
  };
  await setActiveTimer(updated);
  if (shouldPlaySound) {
    playSound(SOUNDS.breakComplete);
  }
  return {
    action: "to-focus",
    timer: updated,
    message: options?.skip ? "Skipped break" : "Break finished",
    subtitle: "Back to focus",
  };
}

// ========== Date Range Utilities ==========

export type PeriodType = "this-week" | "last-week" | "this-month" | "last-month";

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export function getWeekRange(offset: number = 0): DateRange {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const label = offset === 0 ? "This Week" : offset === -1 ? "Last Week" : `Week ${offset}`;
  return { start: monday, end: sunday, label };
}

export function getMonthRange(offset: number = 0): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);

  const monthName = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const label = offset === 0 ? "This Month" : offset === -1 ? "Last Month" : monthName;
  return { start, end, label };
}

export function getPeriodRange(period: PeriodType): DateRange {
  switch (period) {
    case "this-week":
      return getWeekRange(0);
    case "last-week":
      return getWeekRange(-1);
    case "this-month":
      return getMonthRange(0);
    case "last-month":
      return getMonthRange(-1);
  }
}

export function filterSessionsByRange(sessions: SessionLog[], range: DateRange): SessionLog[] {
  return sessions.filter((s) => s.startedAt >= range.start.getTime() && s.startedAt <= range.end.getTime());
}

export interface ProjectBreakdown {
  project: string;
  durationMs: number;
  sessionCount: number;
  percentage: number;
}

export function getProjectBreakdown(sessions: SessionLog[]): ProjectBreakdown[] {
  const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
  const projectMap = new Map<string, { durationMs: number; count: number }>();

  for (const session of sessions) {
    const key = session.project || "No Project";
    const existing = projectMap.get(key) || { durationMs: 0, count: 0 };
    projectMap.set(key, {
      durationMs: existing.durationMs + session.durationMs,
      count: existing.count + 1,
    });
  }

  const breakdown: ProjectBreakdown[] = [];
  for (const [project, data] of projectMap.entries()) {
    breakdown.push({
      project,
      durationMs: data.durationMs,
      sessionCount: data.count,
      percentage: totalMs > 0 ? Math.round((data.durationMs / totalMs) * 100) : 0,
    });
  }

  return breakdown.sort((a, b) => b.durationMs - a.durationMs);
}

// ========== Export Functions ==========

export function exportToCSV(sessions: SessionLog[]): string {
  const headers = ["Title", "Project", "Started At", "Ended At", "Duration (min)", "Mode"];
  const rows = sessions.map((s) => [
    `"${(s.title || "").replace(/"/g, '""')}"`,
    `"${(s.project || "").replace(/"/g, '""')}"`,
    new Date(s.startedAt).toISOString(),
    new Date(s.endedAt).toISOString(),
    Math.round(s.durationMs / 60000).toString(),
    s.mode,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportToJSON(sessions: SessionLog[]): string {
  const data = sessions.map((s) => ({
    title: s.title,
    project: s.project || null,
    startedAt: new Date(s.startedAt).toISOString(),
    endedAt: new Date(s.endedAt).toISOString(),
    durationMinutes: Math.round(s.durationMs / 60000),
    mode: s.mode,
    pomodoroCycles: s.pomodoroCycles || null,
  }));

  return JSON.stringify(data, null, 2);
}
