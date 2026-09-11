import type { Priority, Task } from "./parser";

export type GroupKey = Priority | "none";

export const PRIORITY_KEYS: GroupKey[] = [...("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("") as Priority[]), "none"];

export function groupByPriority(tasks: Task[]): Map<GroupKey, Task[]> {
  const out = new Map<GroupKey, Task[]>();
  for (const t of tasks) {
    const key: GroupKey = t.priority ?? "none";
    const bucket = out.get(key) ?? [];
    bucket.push(t);
    out.set(key, bucket);
  }
  return out;
}

export function sortGroup(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aDue = a.metadata.due;
    const bDue = b.metadata.due;
    if (aDue && bDue) {
      if (aDue !== bDue) return aDue < bDue ? -1 : 1;
    } else if (aDue && !bDue) {
      return -1;
    } else if (!aDue && bDue) {
      return 1;
    }
    return a.lineNumber - b.lineNumber;
  });
}
