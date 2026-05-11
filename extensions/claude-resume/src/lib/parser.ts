import { createReadStream } from "fs";
import * as path from "path";
import * as readline from "readline";
import { Session } from "./types";

const MAX_TITLE_LENGTH = 90;
const MAX_LINES_SCANNED = 200;
/** Cap full message length to keep Raycast LocalStorage compact. Long prompts get a "…" tail. */
const MAX_FIRST_MESSAGE_LENGTH = 4000;

/**
 * Parse a Claude Code session JSONL file and extract the first user message
 * (string content, not tool-result Array) plus metadata.
 *
 * Returns null if the file contains no qualifying user message within MAX_LINES_SCANNED.
 * Streams the file and exits early as soon as the first qualifying line is found.
 */
export async function parseSession(jsonlPath: string, mtime: number): Promise<Session | null> {
  const uuid = path.basename(jsonlPath, ".jsonl");

  return new Promise((resolve) => {
    let stream;
    try {
      stream = createReadStream(jsonlPath, { encoding: "utf8" });
    } catch {
      resolve(null);
      return;
    }

    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let lineNo = 0;
    let resolved = false;

    const cleanup = (result: Session | null) => {
      if (resolved) return;
      resolved = true;
      rl.close();
      stream.destroy();
      resolve(result);
    };

    rl.on("line", (line) => {
      lineNo++;
      if (lineNo > MAX_LINES_SCANNED) {
        cleanup(null);
        return;
      }

      if (line.length === 0) return;

      let entry;
      try {
        entry = JSON.parse(line);
      } catch {
        // invalid JSON line (e.g. control chars in content) — skip
        return;
      }

      if (entry?.type !== "user") return;

      const content = entry?.message?.content;
      if (typeof content !== "string" || content.length === 0) return;

      const cwd = typeof entry.cwd === "string" ? entry.cwd : "";
      const timestamp = typeof entry.timestamp === "string" ? entry.timestamp : "";

      const trimmed = content.replace(/\s+/g, " ").trim();
      const title = trimmed.length > MAX_TITLE_LENGTH ? trimmed.slice(0, MAX_TITLE_LENGTH) + "…" : trimmed;
      const firstUserMessage =
        content.length > MAX_FIRST_MESSAGE_LENGTH
          ? content.slice(0, MAX_FIRST_MESSAGE_LENGTH) + "\n\n…(truncated)"
          : content;

      cleanup({
        uuid,
        cwd,
        title,
        firstUserMessage,
        timestamp,
        jsonlPath,
        mtime,
      });
    });

    rl.on("error", () => cleanup(null));
    rl.on("close", () => cleanup(null));
  });
}
