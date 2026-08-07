import { batchSync } from "../../api/sync";
import { getHabits } from "../../api/habits";
import { Filter, Habit, Project, Tag, Task } from "../../types/ticktick";

export interface SyncSnapshot {
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  filters: Filter[];
  inboxId: string;
}

export async function loadSyncData(): Promise<SyncSnapshot> {
  const response = await batchSync();
  const tasks = (response.syncTaskBean?.update ?? []).filter((t) => t.deleted !== 1 && t.status !== 2);
  return {
    tasks,
    projects: response.projectProfiles ?? [],
    tags: response.tags ?? [],
    filters: response.filters ?? [],
    inboxId: response.inboxId ?? "",
  };
}

export function summarizeTask(task: Task, projectName?: string) {
  return {
    id: task.id,
    projectId: task.projectId,
    projectName,
    title: task.title,
    content: task.content,
    dueDate: task.dueDate,
    priority: task.priority,
    tags: task.tags ?? [],
    isAllDay: task.isAllDay,
    status: task.status,
  };
}

/**
 * Label a task reference using the synced task it points at, falling back to the ID.
 * Never falls back to caller-supplied text, so a confirmation cannot name one task
 * while the IDs select another.
 */
export function canonicalTaskLabel(tasks: Task[], ref: { taskId: string; projectId: string }): string {
  return tasks.find((t) => t.id === ref.taskId && t.projectId === ref.projectId)?.title ?? ref.taskId;
}

/**
 * Resolve a caller-supplied project ID against synced projects. A non-empty but unknown
 * ID would otherwise pass local preparation and only fail once TickTick rejects it,
 * which in a batch means earlier items are already written.
 */
export function requireProject(projects: Project[], projectId: string, context = ""): Project {
  const found = projects.find((p) => p.id === projectId);
  if (!found) {
    throw new Error(
      `${context}Project "${projectId}" not found. Call list-projects and retry with a current projectId.`,
    );
  }
  return found;
}

export function findProjectByName(projects: Project[], name: string): Project | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  const exact = projects.find((p) => p.name.toLowerCase() === q);
  if (exact) return exact;
  return projects.find((p) => p.name.toLowerCase().includes(q));
}

export function findHabitByName(habits: Habit[], name: string): Habit | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  const exact = habits.find((h) => h.name.toLowerCase() === q);
  if (exact) return exact;
  return habits.find((h) => h.name.toLowerCase().includes(q));
}

export type HabitRef = {
  habitId?: string;
  habitName?: string;
};

export function resolveHabitRefs(
  refs: HabitRef[],
  habits: Habit[],
  notFoundHint = "Call list-habits and retry.",
): Array<{ habitId: string; habitName: string }> {
  return refs.map((ref) => {
    let habitId = ref.habitId;
    if (!habitId && ref.habitName) {
      const match = findHabitByName(habits, ref.habitName);
      if (!match) {
        throw new Error(`Habit "${ref.habitName}" not found.${notFoundHint ? ` ${notFoundHint}` : ""}`);
      }
      habitId = match.id;
    }
    if (!habitId) throw new Error("Each habit requires habitId or habitName.");
    // Always read the name back from the habit list. A caller-supplied habitName is only
    // a lookup key, never a label, so it cannot describe a different habit than the ID.
    return { habitId, habitName: habits.find((h) => h.id === habitId)?.name ?? habitId };
  });
}

export async function loadHabits(): Promise<Habit[]> {
  return getHabits();
}

export function priorityFromLabel(label?: string): 0 | 1 | 3 | 5 | undefined {
  if (!label) return undefined;
  switch (label.toLowerCase()) {
    case "none":
      return 0;
    case "low":
      return 1;
    case "medium":
      return 3;
    case "high":
      return 5;
    default:
      return undefined;
  }
}

export function priorityLabel(priority: number): string {
  switch (priority) {
    case 1:
      return "low";
    case 3:
      return "medium";
    case 5:
      return "high";
    default:
      return "none";
  }
}
