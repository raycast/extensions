import { Worker } from "node:worker_threads";
import { MAX_INPUT_BYTES } from "./json";

export type Match = {
  text: string;
  line: number;
  column: number;
  excerpt: string;
};
export type SearchResult = { matches: Match[]; truncated: boolean };

// The worker is isolated and terminated on timeout, including during RegExp backtracking.
function regexWorker() {
  // The isolated worker executes this function without the parent module imports.
  const { parentPort, workerData } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("node:worker_threads") as typeof import("node:worker_threads");
  try {
    const { text, pattern, ignoreCase, limit } = workerData as {
      text: string;
      pattern: string;
      ignoreCase: boolean;
      limit: number;
    };
    const regex = new RegExp(pattern, ignoreCase ? "gi" : "g");
    const matches: Match[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (matches.length === limit) {
        parentPort!.postMessage({ matches, truncated: true });
        return;
      }
      const before = text.slice(0, match.index);
      const start = before.lastIndexOf("\n") + 1;
      const end = text.indexOf("\n", match.index);
      matches.push({
        text: match[0],
        line: before.split("\n").length,
        column: Array.from(before.slice(start)).length + 1,
        excerpt: text.slice(start, end < 0 ? text.length : end).slice(0, 300),
      });
      if (match[0].length === 0) regex.lastIndex += 1;
    }
    parentPort!.postMessage({ matches, truncated: false });
  } catch (error) {
    parentPort!.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function searchText(
  text: string,
  pattern: string,
  ignoreCase: boolean,
  timeout = 1000,
  limit = 500,
): Promise<SearchResult> {
  if (Buffer.byteLength(text, "utf8") > MAX_INPUT_BYTES)
    return Promise.reject(new Error("Input exceeds the 1 MiB limit"));
  if (!pattern) return Promise.reject(new Error("Enter a regular expression"));
  return new Promise((resolve, reject) => {
    const worker = new Worker(`(${regexWorker.toString()})()`, {
      eval: true,
      workerData: { text, pattern, ignoreCase, limit },
    });
    let settled = false;
    const finish = (error?: Error, result?: SearchResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      if (error) reject(error);
      else resolve(result!);
    };
    const timer = setTimeout(
      () => finish(new Error("Search timed out")),
      timeout,
    );
    worker.once("message", (message: SearchResult & { error?: string }) => {
      if (message.error) finish(new Error(message.error));
      else finish(undefined, message);
    });
    worker.once("error", (error) => finish(error));
    worker.once("exit", (code) => {
      if (!settled) finish(new Error(`Search worker exited (${code})`));
    });
  });
}
