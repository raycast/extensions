import { environment } from "@raycast/api";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { listCollections as listDiskCollections, type Collection } from "./library";
import type { CrawlProgress } from "./docs";

export type { Collection } from "./library";
export const listCollections = () => listDiskCollections(undefined, environment.supportPath);

type ImportRequest = { rootUrl: string; engine: "built-in" | "firecrawl"; firecrawlUrl: string };
type WorkerMessage =
  | { kind: "progress"; progress: CrawlProgress }
  | { kind: "complete"; collection: Collection }
  | { kind: "error"; error: string };

export function importDocumentation(request: ImportRequest, onProgress: (progress: CrawlProgress) => void): Promise<Collection> {
  return new Promise((resolve, reject) => {
    const workerPath = join(environment.assetsPath, "crawl-worker.cjs");
    const child = spawn(process.execPath, [workerPath, JSON.stringify(request)], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let completed: Collection | undefined;
    let failure: string | undefined;
    const timeout = setTimeout(() => {
      failure = "Import exceeded 20 minutes. Previous searchable collection was kept.";
      child.kill();
    }, 20 * 60 * 1000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      let newline = stdout.indexOf("\n");
      while (newline >= 0) {
        const line = stdout.slice(0, newline);
        stdout = stdout.slice(newline + 1);
        try {
          const message = JSON.parse(line) as WorkerMessage;
          if (message.kind === "progress") onProgress(message.progress);
          if (message.kind === "complete") completed = message.collection;
          if (message.kind === "error") failure = message.error;
        } catch { failure = `Crawler sent an invalid progress message: ${line.slice(0, 100)}`; }
        newline = stdout.indexOf("\n");
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => { stderr = `${stderr}${chunk}`.slice(-3000); });
    child.on("error", (error) => { failure = error.message; });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0 && completed) resolve(completed);
      else reject(new Error(failure || stderr.trim() || `Crawler exited with code ${code}. Previous searchable collection was kept.`));
    });
  });
}
