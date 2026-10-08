import type { Task } from "./types";

/**
 * Sort by recent activity, falling back to creation time. Mirrors the GUI's
 * "quick access" intent (TaskListView.swift sorts by lastManualRunAt) — we
 * use lastRunAt because the CLI DTO doesn't expose lastManualRunAt yet.
 */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const ka = a.lastRunAt ?? a.createdAt;
    const kb = b.lastRunAt ?? b.createdAt;
    return kb.localeCompare(ka);
  });
}
