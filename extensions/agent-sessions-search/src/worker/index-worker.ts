import { dropDb, isLocked } from "../lib/db";
import { setConfig } from "../lib/config";
import { refreshIndex } from "../lib/indexer";

/**
 * Standalone indexing process. Raycast caps a command's JS heap at 100 MB, which a full
 * first-time index over gigabytes of transcripts can exceed, so the extension spawns this
 * script with Raycast's own Node binary. Protocol: argv[2] is a JSON payload
 * { mode: "refresh" | "rebuild", config: IndexConfig }; stdout carries one JSON object per line
 * ({ progress } while running, { summary } at the end, { error } on failure).
 */
async function main() {
  const payload = JSON.parse(process.argv[2] ?? "{}") as { mode?: string; config?: Parameters<typeof setConfig>[0] };
  if (!payload.config) throw new Error("missing config");
  setConfig(payload.config);
  if (payload.mode === "rebuild") {
    if (isLocked()) throw new Error("An index refresh is running; retry the rebuild in a minute");
    dropDb();
  }
  let last = 0;
  const summary = await refreshIndex({
    onProgress: (p) => {
      const now = Date.now();
      if (now - last < 200 && p.done !== p.total) return;
      last = now;
      process.stdout.write(JSON.stringify({ progress: { done: p.done, total: p.total } }) + "\n");
    },
  });
  process.stdout.write(JSON.stringify({ summary }) + "\n");
}

main().catch((e) => {
  process.stdout.write(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) + "\n");
  process.exit(1);
});
