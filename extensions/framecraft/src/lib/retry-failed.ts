import fs from "node:fs";
import path from "node:path";
import { statePaths, jellyfinStreamUrl } from "./env";
import { readHistory, readQueue, listActiveTasks, enqueueTask, deleteHistoryEntry, withTaskStateLock } from "./queue";
import { QueueTask, RuntimeConfig } from "./types";

export async function retryAllFailed(config: RuntimeConfig): Promise<{ submitted: number; skipped: number }> {
  let submitted = 0,
    skipped = 0;
  withTaskStateLock(config.supportPath, () => {
    const occupied = new Set([
      ...readQueue(config.supportPath).map((t) => t.id),
      ...listActiveTasks(config.supportPath).map((s) => s.task.id),
    ]);
    const accepted = new Set<string>();
    for (const entry of readHistory(config.supportPath).filter((h) => h.status === "failed")) {
      if (occupied.has(entry.id)) {
        skipped++;
        continue;
      }
      try {
        const task = JSON.parse(
          fs.readFileSync(path.join(statePaths(config.supportPath).projectsDir, entry.id, "retry.json"), "utf8"),
        ) as QueueTask;
        task.config = config;
        if (task.probe.source === "jellyfin-remote" && task.probe.itemId)
          task.probe.mediaTarget = jellyfinStreamUrl(
            config.jellyfinUrl,
            config.jellyfinApiKey,
            task.probe.itemId,
            task.probe.mediaSourceId,
          );
        const key = task.id;
        if (accepted.has(key)) {
          deleteHistoryEntry(config.supportPath, entry.id);
          skipped++;
          continue;
        }
        enqueueTask(config.supportPath, task);
        accepted.add(key);
        occupied.add(task.id);
        deleteHistoryEntry(config.supportPath, entry.id);
        submitted++;
      } catch {
        skipped++;
      }
    }
  });
  return { submitted, skipped };
}
