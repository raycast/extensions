import { execFile } from "node:child_process";
import { helperPath } from "swift:../swift/AppleTranslate";
import { parseReply, Request, Reply } from "./protocol";

export async function runNative(
  entry: "handleRequest" | "showWindow",
  request: unknown,
  signal?: AbortSignal,
): Promise<string> {
  const binary = await helperPath();
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = execFile(
      binary,
      [entry],
      {
        signal,
        timeout: entry === "showWindow" ? 0 : 120_000,
        maxBuffer: 4_000_000,
      },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        try {
          const output: unknown = JSON.parse(stdout);
          if (typeof output !== "string")
            throw new Error("Invalid response from Apple Translate.");
          resolve(output);
        } catch (error) {
          reject(error);
        }
      },
    );
    child.stdin?.on("error", reject);
    // The exported Swift function reads the payload from stdin, not argv.
    child.stdin?.end(JSON.stringify(request));
  });
}

export async function callNative(
  request: Request,
  signal?: AbortSignal,
): Promise<Reply> {
  return parseReply(await runNative("handleRequest", request, signal));
}
