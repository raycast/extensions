import { AppFreezerApplication } from "./protocol";

export const APPLICATION_SORT_MODES = ["name", "cpu", "memory"] as const;

export type ApplicationSortMode = (typeof APPLICATION_SORT_MODES)[number];

export function isApplicationSortMode(value: string): value is ApplicationSortMode {
  return (APPLICATION_SORT_MODES as readonly string[]).includes(value);
}

export function sortApplications(
  applications: readonly AppFreezerApplication[],
  mode: ApplicationSortMode,
): AppFreezerApplication[] {
  return [...applications].sort((left, right) => {
    switch (mode) {
      case "cpu":
        if (left.cpuPercent !== right.cpuPercent) {
          return right.cpuPercent - left.cpuPercent;
        }
        break;
      case "memory":
        if (left.memoryPercent !== right.memoryPercent) {
          return right.memoryPercent - left.memoryPercent;
        }
        break;
      case "name":
        break;
      default: {
        const exhaustive: never = mode;
        throw new Error(`Unsupported sort mode: ${String(exhaustive)}`);
      }
    }
    return left.name.localeCompare(right.name);
  });
}
