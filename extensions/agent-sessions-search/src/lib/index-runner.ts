import { environment } from "@raycast/api";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getConfig } from "./config";
import { closeDb } from "./db";
import { IndexProgress, IndexSummary } from "./indexer";

export interface RunOptions {
  mode: "refresh" | "rebuild";
  onProgress?: (p: Pick<IndexProgress, "done" | "total">) => void;
}

/**
 * Run indexing in a child process (see src/worker/index-worker.ts) so the extension stays
 * within Raycast's 100 MB heap limit. Indexing in-process is not a safe fallback (it is exactly
 * what gets killed), so a missing worker bundle is reported instead.
 */
export function runIndex(opts: RunOptions): Promise<IndexSummary> {
  const worker = join(environment.assetsPath, "index-worker.cjs");
  if (!existsSync(worker)) {
    return Promise.reject(new Error("Index worker not built. Run `npm run build:worker` (or `npm run dev`)."));
  }
  // Release our connection so a rebuild can delete the database file underneath us.
  closeDb();
  const payload = JSON.stringify({ mode: opts.mode, config: getConfig() });
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--no-warnings", worker, payload], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_OPTIONS: "" },
    });
    let buffer = "";
    let stderr = "";
    let summary: IndexSummary | null = null;
    let error: string | null = null;
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      buffer += chunk;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line) as { progress?: IndexProgress; summary?: IndexSummary; error?: string };
          if (msg.progress && opts.onProgress) opts.onProgress(msg.progress);
          if (msg.summary) summary = msg.summary;
          if (msg.error) error = msg.error;
        } catch {
          // ignore malformed output
        }
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (c: string) => (stderr += c));
    child.on("error", reject);
    child.on("close", (code) => {
      if (summary) resolve(summary);
      else reject(new Error(error ?? `index worker exited with code ${code}: ${stderr.slice(-500)}`));
    });
  });
}
