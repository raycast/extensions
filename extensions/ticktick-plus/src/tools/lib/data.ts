import { batchSync } from "../../api/sync";
import { getHabits } from "../../api/habits";
import { getTask } from "../../api/tasks";
import { isApiStatus } from "../../api/errors";
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
 * Resolve a caller-supplied task reference against synced tasks. A stale or unknown
 * taskId would otherwise pass local preparation and only fail once TickTick rejects it,
 * which in a batch means earlier items are already written (or, for deletes, applied).
 */
export function requireTask(tasks: Task[], ref: { taskId: string; projectId: string }, context = ""): Task {
  const found = tasks.find((t) => t.id === ref.taskId && t.projectId === ref.projectId);
  if (!found) {
    throw new Error(
      `${context}Task "${ref.taskId}" not found. Call search-tasks and retry with a current taskId and projectId.`,
    );
  }
  return found;
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
      } catch (error) {
        // Only a confirmed 404 means the reference is stale. Auth, rate-limit, network and
        // server failures must surface as themselves — reporting them as "not found" would
        // send the caller off correcting IDs that were never wrong.
        if (!isApiStatus(error, 404)) throw error;
        throw new Error(
          `${context}task "${ref.taskId}" was not found in project "${ref.projectId}". Call search-tasks and retry with current IDs.`,
          { cause: error },
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

/**
 * Resolve a caller-supplied habit ID against the loaded habit list. A non-empty but unknown
 * ID would otherwise pass local preparation and only fail once TickTick rejects it,
 * which in a batch means earlier check-ins (or undos) are already written.
 */
export function requireHabit(habits: Habit[], habitId: string, context = ""): Habit {
  const found = habits.find((h) => h.id === habitId);
  if (!found) {
    throw new Error(`${context}Habit "${habitId}" not found. Call list-habits and retry with a current habitId.`);
  }
  return found;
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
  return refs.map((ref, index) => {
    const context = refs.length > 1 ? `Habit ${index + 1} of ${refs.length}: ` : "";
    let habitId = ref.habitId;
    if (!habitId && ref.habitName) {
      const match = findHabitByName(habits, ref.habitName);
      if (!match) {
        throw new Error(`${context}Habit "${ref.habitName}" not found.${notFoundHint ? ` ${notFoundHint}` : ""}`);
      }
      habitId = match.id;
    }
    if (!habitId) throw new Error(`${context}Each habit requires habitId or habitName.`);
    // Always read the name back from the habit list. A caller-supplied habitName is only
    // a lookup key, never a label, so it cannot describe a different habit than the ID.
    const habit = requireHabit(habits, habitId, context);
    return { habitId: habit.id, habitName: habit.name };
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
