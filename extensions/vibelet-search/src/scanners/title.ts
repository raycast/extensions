import { cleanTitle, getAdapter, isMeaningfulUserMessage } from "../adapters";
import { readJsonlUntil } from "../load-messages";
import type { SessionFormat } from "../types";

/**
 * Extract a session title from a JSONL file by finding the first meaningful user message.
 *
 * For Claude files, also returns the `cwd` field carried on each line — the project
 * directory name under `~/.claude/projects/` is a lossy `-` substitution and can't be
 * reversed back to the real path, so the only reliable source is the JSONL content.
 */
export async function extractTitleFromFile(
  filePath: string,
  format: SessionFormat,
): Promise<{ title: string; timestamp: string; cwd: string }> {
  const adapter = getAdapter(format);
  // Codex sessions can have a very long AGENTS.md as the first user message; read more bytes
  const maxBytes = format === "codex" ? 131072 : 65536;

  let title = "";
  let timestamp = "";
  let cwd = "";

  // `stop` closes over the running title/cwd state: keep reading until we've found a
  // title AND (for Claude) the cwd. readJsonlUntil destroys the stream as soon as this
  // returns true, so a session whose first prompt is near the top pays only a few bytes.
  await readJsonlUntil(filePath, maxBytes, (raw) => {
    if (!cwd && format === "claude" && raw && typeof raw === "object") {
      const maybeCwd = (raw as { cwd?: unknown }).cwd;
      if (typeof maybeCwd === "string" && maybeCwd) cwd = maybeCwd;
    }

    if (!title) {
      const parsed = adapter.parseLine(raw);
      if (
        parsed &&
        parsed.role === "user" &&
        parsed.content.trim().length >= 3 &&
        isMeaningfulUserMessage(parsed.content)
      ) {
        title = cleanTitle(parsed.content);
        timestamp = parsed.timestamp;
      }
    }

    return !!title && (format !== "claude" || !!cwd);
  });

  return { title: title || "Untitled Session", timestamp, cwd };
}
