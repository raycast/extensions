import type { WorkLog } from "./types";

export function getRecentDescriptions(workLogs: WorkLog[], projectId: string): string[] {
  const seen = new Set<string>();
  const descriptions: string[] = [];

  const newestFirst = [...workLogs].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  for (const workLog of newestFirst) {
    if (workLog.projectId !== projectId) continue;
    const description = workLog.description.trim();
    if (!description) continue;

    const key = description.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    descriptions.push(description);
  }

  return descriptions.slice(0, 20);
}
