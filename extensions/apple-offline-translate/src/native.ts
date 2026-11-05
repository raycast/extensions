import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { parseReply, Request, Reply } from "./protocol";

export function callNative(
  request: Request,
  signal?: AbortSignal,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      join(environment.assetsPath, "apple-translate"),
      [],
      { signal, timeout: 120_000, maxBuffer: 4_000_000 },
      (error, stdout) => {
        if (error) {
          reject(
            new Error(
              error.name === "AbortError"
                ? "Cancelled"
                : "Apple Translate could not run. Requires Apple Silicon, macOS 26.4+, and installed language models. Try again; the first translation may take longer.",
            ),
          );
          return;
        }
        try {
          resolve(parseReply(stdout));
        } catch (error) {
          reject(error);
        }
      },
    );
    child.stdin?.on("error", reject);
    // Keep user text out of command arguments, shell expansion, and temporary files.
    child.stdin?.end(JSON.stringify(request));
  });
}
