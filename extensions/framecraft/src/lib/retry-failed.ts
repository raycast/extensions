import fs from "node:fs";
import path from "node:path";
import { statePaths, jellyfinStreamUrl } from "./env";
import {
  readHistory,
  readQueue,
  listActiveTasks,
  enqueueTask,
  deleteHistoryEntry,
  spawnDetachedWorker,
  withTaskStateLock,
} from "./queue";
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
        // Preserve distinct user invocations; only collapse version branches of one request.
        let key = task.id;
        if (task.type === "screenshot" && task.captureRequestId) {
          const parent = path.join(statePaths(config.supportPath).projectsDir, task.captureRequestId, "playlists.json");
          try {
            const candidate = (
              JSON.parse(fs.readFileSync(parent, "utf8")) as Array<{
                playlist: number;
                segments: unknown;
                durationSec: number;
              }>
            ).find((c) => c.playlist === task.probe.playlist);
            if (candidate?.segments)
              key = `${task.captureRequestId}:${JSON.stringify([candidate.durationSec, candidate.segments])}`;
          } catch {
            /* Older task lacks source identity. */
          }
        }
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
  if (submitted) await spawnDetachedWorker(config);
  return { submitted, skipped };
}
