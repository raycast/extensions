import { batchSync } from "../../api/sync";
import { getHabits } from "../../api/habits";
import { getTask } from "../../api/tasks";
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

export type TaskRef = { taskId: string; projectId: string };
export type ResolvedTaskRef = { taskId: string; projectId: string; title: string };

/**
 * Resolve every task reference in a batch to a real task before anything is mutated.
 *
 * A reference that resolves to nothing — a stale ID, or a task paired with the project it
 * used to live in — would otherwise be labelled with its raw ID and only rejected by
 * TickTick once earlier items in the batch had already been completed or deleted.
 *
 * The active snapshot excludes completed tasks, so an unmatched reference is confirmed
 * against the API rather than assumed invalid.
 */
export async function resolveTaskRefs(refs: TaskRef[], tasks: Task[]): Promise<ResolvedTaskRef[]> {
  return Promise.all(
    refs.map(async (ref, index) => {
      const context = refs.length > 1 ? `Task ${index + 1} of ${refs.length}: ` : "";
      const known = tasks.find((t) => t.id === ref.taskId && t.projectId === ref.projectId);
      if (known) return { taskId: ref.taskId, projectId: ref.projectId, title: known.title };

      try {
        const task = await getTask(ref.projectId, ref.taskId);
        return { taskId: ref.taskId, projectId: ref.projectId, title: task.title };
      } catch {
        throw new Error(
          `${context}task "${ref.taskId}" was not found in project "${ref.projectId}". Call search-tasks and retry with current IDs.`,
        );
      }
    }),
  );
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
