import fs from "node:fs";
import path from "node:path";
import { SegmentCache } from "./segment-cache";
import { listActiveTasks, readQueue } from "./queue";

/** Explicit cleanup only. Never removes saved PNG/SVG/video exports or live projects. */
export async function clearTemporaryStorage(supportPath: string, expiredOnly = false): Promise<number> {
  const cache = new SegmentCache(supportPath);
  let freed = 0;
  if (expiredOnly) await cache.prune();
  else freed = await cache.clearUnused();
  // Compose tasks work inside their capture's folder; studio exports write into theirs.
  const tasks = [...listActiveTasks(supportPath).map((s) => s.task), ...readQueue(supportPath)];
  const protectedIds = new Set(tasks.flatMap((t) => (t.type === "compose" ? [t.id, t.parentId] : [t.id])));
  const projects = path.join(supportPath, "projects");
  if (fs.existsSync(projects))
    for (const id of fs.readdirSync(projects)) {
      if (protectedIds.has(id)) continue;
      const dir = path.join(projects, id);
      if (!fs.statSync(dir).isDirectory()) continue;
      if (fs.existsSync(path.join(dir, ".studio-export.lock"))) continue;
      for (const name of fs.readdirSync(dir)) {
        // Keep source layers/manifests for subsequent editing; remove only abandoned transport temporaries.
        if (
          /^(?:_preroll\.mkv|_disc-[\da-f-]+\.ts|_text_overlay_.*\.png(?:\.spec\.json)?|track_\d+\.sup|preview-\d+\.jpg)$/.test(
            name,
          )
        ) {
          const file = path.join(dir, name);
          freed += fs.statSync(file).size;
          fs.rmSync(file, { force: true });
        } else if (/^_compose-source\./.test(name)) {
          // Kept after a failed compose so Retry can rebuild subtitles; released after a day.
          const file = path.join(dir, name);
          const stat = fs.statSync(file);
          if (Date.now() - stat.mtimeMs > 24 * 60 * 60 * 1000) {
            freed += stat.size;
            fs.rmSync(file, { force: true });
          }
        }
      }
    }
  // Left over from versions that compiled a helper at runtime.
  fs.rmSync(path.join(supportPath, "bin-cache"), { recursive: true, force: true });
  return freed;
}
