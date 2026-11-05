import { readdirSync } from "node:fs";
import { join } from "node:path";

/** Filename-only discovery. Never guesses by latest activity or reads unrelated dialogue. */
export function findTranscript(root: string, sessionId: string, codex = false): string | undefined {
  if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) return undefined;
  const matches: string[] = [];
  function visit(directory: string, depth: number) {
    try {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory() && depth < 4) visit(path, depth + 1);
        else if (
          entry.isFile() &&
          (codex ? entry.name.endsWith(`-${sessionId}.jsonl`) : entry.name === `${sessionId}.jsonl`)
        )
          matches.push(path);
      }
    } catch {
      /* Optional source root. */
    }
  }
  visit(root, 0);
  return matches.length === 1 ? matches[0] : undefined;
}
