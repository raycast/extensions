import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { homedir } from "node:os";

export interface Note {
  /** Absolute path on disk. Stable for the lifetime of the file. */
  path: string;
  /** Folder relative to the notes root, empty for top-level notes. */
  folder: string;
  title: string;
  content: string;
  modifiedAt: number;
}

/** Characters that cannot appear in a macOS filename. */
const ILLEGAL_IN_FILENAME = /[/\\:*?"<>|]/g;

export function expandTilde(path: string): string {
  return path.startsWith("~") ? join(homedir(), path.slice(1)) : path;
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/**
 * Every read walks the notes folder from scratch — there is no index to keep in
 * sync, so files renamed, moved or nested outside Raycast need no reconciliation.
 */
export function scanNotes(root: string): Note[] {
  const notes: Note[] = [];
  walk(root, root, notes);
  return notes.sort((a, b) => b.modifiedAt - a.modifiedAt);
}

function walk(root: string, current: string, notes: Note[]): void {
  let entries;
  try {
    entries = readdirSync(current, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const path = join(current, entry.name);

    if (entry.isDirectory()) {
      walk(root, path, notes);
      continue;
    }
    if (extname(entry.name).toLowerCase() !== ".md") continue;

    try {
      const content = readFileSync(path, "utf-8");
      notes.push({
        path,
        folder: relative(root, current),
        title: titleOf(content, path),
        content,
        modifiedAt: statSync(path).mtimeMs,
      });
    } catch {
      continue;
    }
  }
}

/**
 * The title is read from the content rather than the filename, so it stays
 * correct after the file is renamed outside the extension.
 */
export function titleOf(content: string, path?: string): string {
  for (const line of content.split("\n")) {
    const title = line.replace(/^#+\s*/, "").trim();
    if (title) return title;
  }
  return path ? basename(path, extname(path)) : "Untitled";
}

/**
 * Case is preserved so non-ASCII titles survive intact; only whitespace and
 * characters illegal in a filename are rewritten.
 */
export function slugify(title: string): string {
  const slug = title
    .replace(ILLEGAL_IN_FILENAME, "")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|-+$/g, "")
    .slice(0, 60)
    .trim();
  return slug || "note";
}

export function uniqueNotePath(root: string, slug: string): string {
  let candidate = join(root, `${slug}.md`);
  for (let n = 2; existsSync(candidate); n++) {
    candidate = join(root, `${slug}-${n}.md`);
  }
  return candidate;
}

/** Local date, not UTC: a note captured at 02:00 belongs to that local day. */
export function localDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function localTime(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function dailyNotePath(root: string, now: Date): string {
  return join(root, "daily", `${localDate(now)}.md`);
}

export function appendToDaily(root: string, text: string, now: Date): string {
  const path = dailyNotePath(root, now);
  ensureDir(join(root, "daily"));

  if (!existsSync(path)) {
    writeFileSync(path, `# ${localDate(now)}\n\n`);
  } else if (!readFileSync(path, "utf-8").endsWith("\n")) {
    appendFileSync(path, "\n");
  }

  appendFileSync(path, `- ${localTime(now)} ${text}\n`);
  return path;
}
