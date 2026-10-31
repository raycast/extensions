import { useEffect, useState } from "react";

import { makeClient } from "./auth";
import type { AnyDoSubtask, AnyDoTask } from "./types";

/**
 * Subtasks require one request per task, so they are fetched lazily — only for the row the user has
 * selected — and cached (with a short TTL) so the side panel and the action menu can both read them.
 */
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; items: AnyDoSubtask[] }>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeSubtasks(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedSubtasks(taskId: string): AnyDoSubtask[] {
  const entry = cache.get(taskId);
  return entry?.items ?? [];
}

export function hasCachedSubtasks(taskId: string): boolean {
  const entry = cache.get(taskId);
  return Boolean(entry && Date.now() - entry.at < TTL_MS);
}

export async function loadSubtasks(
  task: AnyDoTask,
  force = false,
): Promise<AnyDoSubtask[]> {
  if (!force && hasCachedSubtasks(task.task_id))
    return getCachedSubtasks(task.task_id);
  try {
    const items = await makeClient().getSubtasks(task);
    cache.set(task.task_id, { at: Date.now(), items });
    notify();
    return items;
  } catch {
    cache.set(task.task_id, { at: Date.now(), items: [] });
    notify();
    return [];
  }
}

export async function toggleSubtask(
  task: AnyDoTask,
  subtask: AnyDoSubtask,
  done: boolean,
): Promise<void> {
  await makeClient().updateSubtask(task, subtask.subtask_id, {
    status: done ? "checked" : "unchecked",
  });
  await loadSubtasks(task, true);
}

export async function addSubtaskTo(
  task: AnyDoTask,
  title: string,
): Promise<void> {
  await makeClient().addSubtask(task, title);
  await loadSubtasks(task, true);
}

/** Live view of one task's subtasks for React components. */
export function useSubtasks(taskId: string): AnyDoSubtask[] | undefined {
  const [, setTick] = useState(0);
  useEffect(() => subscribeSubtasks(() => setTick((value) => value + 1)), []);
  return hasCachedSubtasks(taskId) ? getCachedSubtasks(taskId) : undefined;
}
