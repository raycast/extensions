import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { retentionPreferences } from "./preferences";
import { CiRunStatus, ConfiguredCiJob, RunHistoryEntry } from "./types";

const RUN_HISTORY_KEY = "gearset-run-history-v1";

export function pruneRunHistory(
  entries: RunHistoryEntry[],
  now = new Date(),
  retention = retentionPreferences(),
): RunHistoryEntry[] {
  const oldest = now.getTime() - retention.days * 24 * 60 * 60 * 1000;
  return entries
    .filter((entry) => new Date(entry.timestamp).getTime() >= oldest)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, retention.limit);
}

export async function getRunHistory(): Promise<RunHistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(RUN_HISTORY_KEY);
  if (!raw) return [];
  try {
    return pruneRunHistory(JSON.parse(raw) as RunHistoryEntry[]);
  } catch {
    return [];
  }
}

export async function addRunHistory(
  job: ConfiguredCiJob,
  runRequestId: string,
  sourceGitCommitId?: string,
): Promise<RunHistoryEntry> {
  const entry: RunHistoryEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    jobId: job.id,
    jobName: job.name,
    environment: job.environment,
    runRequestId,
    state: "Pending",
    sourceGitCommitId,
  };
  const entries = pruneRunHistory([entry, ...(await getRunHistory())]);
  await LocalStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(entries));
  return entry;
}

export async function updateRunHistory(id: string, status: CiRunStatus): Promise<void> {
  const entries = (await getRunHistory()).map((entry) =>
    entry.id === id
      ? {
          ...entry,
          state: status.State,
          runId: status.RunId,
          startDateTime: status.StartDateTime,
          endDateTime: status.EndDateTime,
        }
      : entry,
  );
  await LocalStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(pruneRunHistory(entries)));
}

export async function clearRunHistory(): Promise<void> {
  await LocalStorage.removeItem(RUN_HISTORY_KEY);
}
