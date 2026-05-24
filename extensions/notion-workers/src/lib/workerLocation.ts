import { getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const STORAGE_PREFIX = "workerLocation:";

export function useWorkerLocation(workerId: string) {
  return useCachedState<string | null>(`${STORAGE_PREFIX}${workerId}`, null);
}

export function getDefaultWorkerLocation(workerName: string): string {
  const { workersLocation } = getPreferenceValues<{
    workersLocation?: string;
  }>();
  if (workersLocation) {
    try {
      if (
        existsSync(workersLocation) &&
        statSync(workersLocation).isDirectory()
      ) {
        const candidate = join(workersLocation, workerName);
        if (existsSync(candidate) && statSync(candidate).isDirectory()) {
          return candidate;
        }
        return workersLocation;
      }
    } catch {
      // fall through
    }
  }
  return join(homedir(), "Documents");
}
