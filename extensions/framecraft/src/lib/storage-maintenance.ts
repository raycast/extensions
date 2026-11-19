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
  const protectedIds = new Set([
    ...listActiveTasks(supportPath).map((s) => s.task.id),
    ...readQueue(supportPath).map((t) => t.id),
  ]);
  const projects = path.join(supportPath, "projects");
  if (fs.existsSync(projects))
    for (const id of fs.readdirSync(projects)) {
      if (protectedIds.has(id)) continue;
      const dir = path.join(projects, id);
      if (!fs.statSync(dir).isDirectory()) continue;
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
        }
      }
    }
  const modules = path.join(supportPath, "bin-cache", "swift-module-cache");
  if (!listActiveTasks(supportPath).length && !readQueue(supportPath).length && fs.existsSync(modules)) {
    const size = (dir: string): number =>
      fs
        .readdirSync(dir, { withFileTypes: true })
        .reduce(
          (sum, e) =>
            sum +
            (e.isDirectory()
              ? size(path.join(dir, e.name))
              : e.isFile()
                ? fs.statSync(path.join(dir, e.name)).size
                : 0),
          0,
        );
    freed += size(modules);
    fs.rmSync(modules, { recursive: true, force: true });
  }
  return freed;
}
