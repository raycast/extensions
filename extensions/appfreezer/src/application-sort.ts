import { AppFreezerApplication } from "./protocol";

export type ApplicationSortMode = "name" | "cpu" | "memory";

export function sortApplications(
  applications: readonly AppFreezerApplication[],
  mode: ApplicationSortMode,
): AppFreezerApplication[] {
  return [...applications].sort((left, right) => {
    if (mode === "cpu" && left.cpuPercent !== right.cpuPercent) {
      return right.cpuPercent - left.cpuPercent;
    }
    if (mode === "memory" && left.memoryPercent !== right.memoryPercent) {
      return right.memoryPercent - left.memoryPercent;
    }
    return left.name.localeCompare(right.name);
  });
}
