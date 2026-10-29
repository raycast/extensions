import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { trash } from "@raycast/api";

const execFileAsync = promisify(execFile);

/**
 * Move paths to Trash with fallbacks.
 *
 * Primary path is Raycast's built-in trash(). If that fails (odd names,
 * volumes without a .Trash dir, permission quirks), fall back per file to
 * a Finder delete via osascript. Paths that no longer exist count as done
 * so stale picks never fail a batch. Per-file results let callers trash
 * only what actually succeeded.
 */
export async function safeTrash(
  paths: string[],
): Promise<{ trashed: string[]; errors: string[] }> {
  const missing: string[] = [];
  const existing: string[] = [];
  for (const p of paths) {
    try {
      await fs.access(p);
      existing.push(p);
    } catch {
      missing.push(p);
    }
  }
  if (existing.length === 0) return { trashed: [...missing], errors: [] };

  try {
    await trash(existing);
    return { trashed: [...existing, ...missing], errors: [] };
  } catch (firstError) {
    const ok: string[] = [...missing];
    const errs: string[] = [];
    for (const p of existing) {
      try {
        await execFileAsync("osascript", [
          "-e",
          `tell application "Finder" to delete POSIX file ${JSON.stringify(p)}`,
        ]);
        ok.push(p);
      } catch (e2) {
        errs.push(`${p}: ${shortError(e2)}`);
      }
    }
    if (errs.length > 0 && ok.length === missing.length) {
      errs.unshift(`trash: ${shortError(firstError)}`);
    }
    return { trashed: ok, errors: errs };
  }
}

export function shortError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  // Shell/binary errors are verbose — keep the informative tail.
  const lines = msg.split("\n").filter((l) => l.trim().length > 0);
  const tail = lines.slice(-2).join(" ").trim();
  const clean = (tail || msg).replace(/\s+/g, " ").trim();
  return clean.length > 220 ? clean.slice(0, 220) + "…" : clean;
}
