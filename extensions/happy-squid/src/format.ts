import type { TaskSnapshot } from "./vendor/task-control";
import { formatHoursMinutes } from "./vendor/format";

const MS_PER_MINUTE = 60_000;

export function duration(ms: number): string {
  return formatHoursMinutes(ms / MS_PER_MINUTE);
}

export function taskTimes(snapshot: TaskSnapshot, now: number) {
  const task = snapshot.task;
  const delta = task?.paused ? 0 : Math.max(0, now - snapshot.capturedAt);
  return {
    remaining: task?.remainingMs == null ? null : Math.max(0, task.remainingMs - delta),
    elapsed: (task?.elapsedMs ?? 0) + delta,
  };
}

export function isTaskExpired(snapshot: TaskSnapshot | null, now: number): boolean {
  return (
    !!snapshot?.task && !snapshot.task.paused && !snapshot.task.openEnded && taskTimes(snapshot, now).remaining === 0
  );
}

/** The backend drops a review nobody has touched for a while; this is that
 *  moment on the page's clock, so a cached or offline snapshot lets it go too. */
export function isReviewExpired(snapshot: TaskSnapshot | null, now: number): boolean {
  const expiresAt = snapshot?.review?.expiresAt;
  return expiresAt !== undefined && now >= expiresAt;
}

export function taskSubtitle(snapshot: TaskSnapshot | null, now: number): string {
  if (!snapshot) return "Happy Squid";
  if (snapshot.review && !isReviewExpired(snapshot, now))
    return `${snapshot.review.status === "checking" ? "Checking" : "Review task"} · ${snapshot.review.description}`;
  const task = snapshot.task;
  if (!task || isTaskExpired(snapshot, now)) return "Start a task";
  const { remaining } = taskTimes(snapshot, now);
  return `${task.paused ? "Paused" : remaining === null ? "Running" : `${duration(remaining)} left`} · ${task.description}`;
}

/** Everything a screen draws from the clock: the launcher subtitle (the rounded
 *  minutes left, paused, run out, a review's state) and the minutes worked. The
 *  page redraws only when this changes, because Raycast counts a render that
 *  draws the same thing again as a rendering loop and may stop the command. */
export function clockFace(snapshot: TaskSnapshot | null, now: number): string {
  const worked = snapshot?.task ? duration(taskTimes(snapshot, now).elapsed) : "";
  return `${taskSubtitle(snapshot, now)}|${worked}`;
}

/** Whether a fresh read shows exactly what the page already shows. Every read
 *  carries its own capture time and restates a running task's clock relative to
 *  it, so those two figures are compared as the moments they name, to within a
 *  second; every other field has to match exactly. */
export function sameTaskSnapshot(a: TaskSnapshot, b: TaskSnapshot): boolean {
  const running = (snapshot: TaskSnapshot) => (snapshot.task && !snapshot.task.paused ? snapshot.task : null);
  const fixed = (snapshot: TaskSnapshot) => {
    const task = running(snapshot);
    return JSON.stringify({
      ...snapshot,
      capturedAt: 0,
      task: task ? { ...task, elapsedMs: 0, remainingMs: task.remainingMs === null ? null : 0 } : snapshot.task,
    });
  };
  const moments = (snapshot: TaskSnapshot) => {
    const task = running(snapshot);
    if (!task) return [];
    return [
      snapshot.capturedAt - task.elapsedMs,
      task.remainingMs === null ? 0 : snapshot.capturedAt + task.remainingMs,
    ];
  };
  if (fixed(a) !== fixed(b)) return false;
  const later = moments(b);
  return moments(a).every((moment, index) => Math.abs(moment - later[index]) < 1_000);
}

/** Task wording is text, not a Markdown document with remote images. */
export function markdownText(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+.!<>|~-]/g, "\\$&");
}

export function sourceName(source: "todoist" | "obsidian" | null): string {
  return source === "todoist" ? "Todoist" : source === "obsidian" ? "Obsidian" : "Happy Squid";
}
