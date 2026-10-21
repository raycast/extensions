import { getOverlapDurationSeconds } from "./date";
import type { ActiveTimer, SavedPlan, PlannedTask, PlanReference, WorkLog } from "./types";

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isPlanDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDateKey(date) === value;
}

export function isPlanComplete(goal: SavedPlan): boolean {
  return goal.tasks.length ? goal.tasks.every((task) => !!task.completedAt) : !!goal.completedAt;
}

// updatedAt also guards stale edits, so it must advance even if the Mac clock does not.
export function nextPlanUpdatedAt(previous?: string, now = new Date()): string {
  return new Date(previous ? Math.max(now.getTime(), Date.parse(previous) + 1) : now.getTime()).toISOString();
}

export function planForDate(goal: SavedPlan, date: string): SavedPlan | undefined {
  if (!goal.tasks.length) return goal.date === date ? goal : undefined;
  const tasks = goal.tasks.filter((task) => (task.date ?? goal.date) === date);
  return tasks.length ? { ...goal, date, tasks, completedAt: undefined } : undefined;
}

export function planDates(goal: SavedPlan): string[] {
  return [...new Set([goal.date, ...(goal.previousDates ?? []), ...goal.tasks.map((task) => task.date ?? goal.date)])];
}

// Ignore empty dates retained only for history after tasks have moved away.
export function latestPlanDateBefore(goals: SavedPlan[], date: string): string | undefined {
  return goals
    .flatMap((goal) => (goal.tasks.length ? goal.tasks.map((task) => task.date ?? goal.date) : [goal.date]))
    .filter((day) => day < date)
    .sort()
    .at(-1);
}

// Replace one day's visible slots, retaining tasks assigned to other days.
export function replaceDayTasks(goal: SavedPlan, date: string, tasks: PlannedTask[]): PlannedTask[] {
  const remaining = [...tasks];
  const merged = goal.tasks.flatMap((task) => {
    if ((task.date ?? goal.date) !== date) return [task];
    const next = remaining.shift();
    return next ? [next] : [];
  });
  return [...merged, ...remaining];
}

export function planMatches(plan: PlanReference | undefined, reference: PlanReference): boolean {
  return plan?.goalId === reference.goalId && plan.taskId === reference.taskId;
}

export function getPlannedItem(goal: SavedPlan, reference: PlanReference): PlannedTask | SavedPlan {
  if (goal.id !== reference.goalId) throw new Error("The plan has changed. Reload Today's Plan.");
  if (!reference.taskId) return goal;
  const task = goal.tasks.find((item) => item.id === reference.taskId);
  if (!task) throw new Error("The task no longer exists. Reload Today's Plan.");
  return task;
}

export function setPlanCompleted(
  goal: SavedPlan,
  reference: PlanReference,
  completed: boolean,
  now: Date,
  date?: string,
): SavedPlan {
  const visible = date ? planForDate(goal, date) : goal;
  if (!visible) throw new Error("The plan has changed. Reload Today's Plan.");
  getPlannedItem(visible, reference);
  const completedAt = completed ? now.toISOString() : undefined;
  return {
    ...goal,
    completedAt: reference.taskId ? undefined : completedAt,
    tasks: goal.tasks.map((task) =>
      (reference.taskId ? task.id === reference.taskId : visible.tasks.some((item) => item.id === task.id))
        ? { ...task, completedAt }
        : task,
    ),
    updatedAt: nextPlanUpdatedAt(goal.updatedAt, now),
  };
}

export function newPlannedTasks(text: string): PlannedTask[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]\s+)?(?:\[[ xX]\]\s*)?/, "").trim())
    .filter(Boolean)
    .map((title) => ({ id: crypto.randomUUID(), title }));
}

export function parsePlanContent(
  content: string,
  previous: PlannedTask[] = [],
): { title: string; tasks: PlannedTask[] } {
  const [firstLine, ...lines] = content.split(/\r?\n/);
  const title = firstLine.trim();
  if (!title) throw new Error("Enter a goal on the first line");
  const tasks = newPlannedTasks(lines.join("\n"));
  const remaining = [...previous];
  // Match unchanged lines first so insertion, deletion and reordering keep their links.
  const matched = tasks.map((task) => {
    const index = remaining.findIndex((old) => old.title === task.title);
    return index === -1 ? undefined : remaining.splice(index, 1)[0];
  });
  // With the same number of unmatched lines, edits are renames in line order.
  const canRename = matched.filter((task) => !task).length === remaining.length;
  return {
    title,
    tasks: tasks.map((task, index) => ({
      ...(matched[index] ?? (canRename ? remaining.shift() : undefined) ?? task),
      title: task.title,
    })),
  };
}

export function planContent(goal: SavedPlan): string {
  return [goal.title, ...goal.tasks.map((task) => task.title)].join("\n");
}

// Recompute from source records so edits, deletions, and cross-midnight work stay accurate.
export function planDurationSeconds(
  date: string,
  logs: WorkLog[],
  timer: ActiveTimer | null,
  now: Date,
  reference?: PlanReference,
): number {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const matches = (plan: PlanReference | undefined) =>
    !reference || (plan?.goalId === reference.goalId && (!reference.taskId || plan.taskId === reference.taskId));
  let seconds = logs
    .filter((log) => matches(log.plan))
    .reduce((total, log) => total + getOverlapDurationSeconds(log.startedAt, log.endedAt, start, end), 0);
  if (
    timer &&
    matches(timer.plan) &&
    !logs.some((log) => log.id === timer.id) &&
    Date.parse(timer.startedAt) <= now.getTime()
  ) {
    seconds += getOverlapDurationSeconds(timer.startedAt, now, start, end);
  }
  return seconds;
}

export function isPlanReference(value: unknown): value is PlanReference {
  return isRecord(value) && nonEmpty(value.goalId) && (value.taskId === undefined || nonEmpty(value.taskId));
}

export function isSavedPlan(value: unknown): value is SavedPlan {
  if (!isRecord(value) || !Array.isArray(value.tasks)) return false;
  return (
    nonEmpty(value.id) &&
    isPlanDate(value.date) &&
    (value.previousDates === undefined ||
      (Array.isArray(value.previousDates) &&
        value.previousDates.every(isPlanDate) &&
        new Set(value.previousDates).size === value.previousDates.length)) &&
    nonEmpty(value.title) &&
    nonEmpty(value.projectId) &&
    optionalDate(value.completedAt) &&
    validDate(value.createdAt) &&
    validDate(value.updatedAt) &&
    value.tasks.every(
      (task) =>
        isRecord(task) &&
        nonEmpty(task.id) &&
        nonEmpty(task.title) &&
        (task.date === undefined || isPlanDate(task.date)) &&
        optionalDate(task.completedAt),
    ) &&
    new Set(value.tasks.map((task) => (task as PlannedTask).id)).size === value.tasks.length
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function validDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
function optionalDate(value: unknown): boolean {
  return value === undefined || validDate(value);
}
