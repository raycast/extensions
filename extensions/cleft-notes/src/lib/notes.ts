import { constants } from "node:fs";
import { open, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, relative, sep } from "node:path";
import { JSON_SCHEMA, load } from "js-yaml";

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_NOTES = 5000;
const MAX_DEPTH = 6;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;

export interface CleftNote {
  id: string;
  path: string;
  title: string;
  tags: string[];
  created: Date;
  updated: Date;
  summary: string;
  transcript: string;
  markdown: string;
  audioPath?: string;
}

export interface NoteLibrary {
  folder: string;
  notes: CleftNote[];
  skipped: number;
  limited: boolean;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function date(value: unknown, fallback: Date): Date {
  const candidate = new Date(text(value));
  return Number.isFinite(candidate.getTime()) ? candidate : fallback;
}

// Cleft documents this frontmatter format in its Local Sync guide.
export function parseNote(
  markdown: string,
  path: string,
  modified: Date,
): CleftNote | undefined {
  const match = markdown
    .replace(/^\uFEFF/, "")
    .match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return undefined;
  let metadata: unknown;
  try {
    metadata = load(match[1], { schema: JSON_SCHEMA });
  } catch {
    return undefined;
  }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return undefined;
  const fields = metadata as Record<string, unknown>;
  if (fields.source !== "cleft") return undefined;
  const id = String(fields.cleft_id ?? "");
  if (!/^\d+$/.test(id)) return undefined;
  return {
    id,
    path,
    title: text(fields.title) || basename(path, ".md"),
    tags: Array.isArray(fields.tags)
      ? fields.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    created: date(fields.created, modified),
    updated: date(fields.updated, modified),
    summary: match[2].trim(),
    transcript: text(fields.transcript),
    markdown,
  };
}

export function defaultSyncFolders(home = homedir()): string[] {
  return [
    join(
      home,
      "Library",
      "Containers",
      "com.cleft.notes",
      "Data",
      "Documents",
      "Cleft Notes",
    ),
    join(home, "Documents", "Cleft Notes"),
  ];
}

export async function resolveSyncFolder(preferred?: string): Promise<string> {
  const candidates = preferred?.trim()
    ? [preferred.trim().replace(/^~(?=\/|$)/, homedir())]
    : defaultSyncFolders();
  let accessError: unknown;
  for (const folder of candidates) {
    try {
      if ((await stat(folder)).isDirectory()) {
        await readdir(folder);
        return folder;
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") accessError = error;
    }
  }
  if (accessError) throw accessError;
  throw new Error(
    "Choose your Cleft Local Sync folder in extension settings. Find its exact path in Cleft Settings → Local Sync → Show path.",
  );
}

export async function readLibrary(folder: string): Promise<NoteLibrary> {
  const root = await realpath(folder);
  const library: NoteLibrary = {
    folder: root,
    notes: [],
    skipped: 0,
    limited: false,
  };
  let bytesRead = 0;
  let filesVisited = 0;
  async function walk(directory: string, depth: number): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (depth < MAX_DEPTH) {
          try {
            await walk(path, depth + 1);
          } catch {
            library.skipped++;
          }
        } else library.limited = true;
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        filesVisited++;
        if (filesVisited > MAX_NOTES || bytesRead >= MAX_TOTAL_BYTES) {
          library.limited = true;
          return;
        }
        let handle;
        try {
          const resolved = await realpath(path);
          const child = relative(root, resolved);
          if (
            child === ".." ||
            child.startsWith(`..${sep}`) ||
            isAbsolute(child)
          )
            continue;
          handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
          const info = await handle.stat();
          if (
            !info.isFile() ||
            info.size > MAX_FILE_BYTES ||
            bytesRead + info.size > MAX_TOTAL_BYTES
          ) {
            library.skipped++;
            if (bytesRead + info.size > MAX_TOTAL_BYTES) library.limited = true;
            continue;
          }
          bytesRead += info.size;
          const note = parseNote(
            await handle.readFile("utf8"),
            path,
            info.mtime,
          );
          if (note) {
            const audioPath = path.replace(/\.md$/i, ".m4a");
            try {
              const audioRealPath = await realpath(audioPath);
              const audioRelative = relative(root, audioRealPath);
              if (
                !audioRelative.startsWith(`..${sep}`) &&
                audioRelative !== ".." &&
                !isAbsolute(audioRelative) &&
                (await stat(audioPath)).isFile()
              )
                note.audioPath = audioPath;
            } catch {
              // Audio exports are optional.
            }
            library.notes.push(note);
          }
        } catch {
          library.skipped++;
        } finally {
          await handle?.close();
        }
      }
      if (filesVisited > MAX_NOTES || bytesRead >= MAX_TOTAL_BYTES) return;
    }
  }
  await walk(root, 0);
  library.notes.sort((a, b) => b.created.getTime() - a.created.getTime());
  return library;
}

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

export function searchNotes(
  notes: CleftNote[],
  query: string,
  tag?: string,
): CleftNote[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return notes.filter((note) => {
    if (tag && !note.tags.includes(tag)) return false;
    const haystack = normalize(
      [note.title, note.summary, note.transcript, ...note.tags].join("\n"),
    );
    return terms.every((term) => haystack.includes(term));
  });
}

/** A short excerpt around the first match of any query term, for previews. */
export function matchSnippet(
  text: string,
  query: string,
  radius = 90,
): string | undefined {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length || !text) return undefined;
  const lower = text.toLowerCase();
  let index = -1;
  for (const term of terms) {
    const found = lower.indexOf(term);
    if (found !== -1 && (index === -1 || found < index)) index = found;
  }
  if (index === -1) return undefined;
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ").trim()}${end < text.length ? "…" : ""}`;
}

export type DateGroup =
  "Today" | "Yesterday" | "This Week" | "This Month" | "Older";

export function dateGroup(date: Date, now = new Date()): DateGroup {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const time = date.getTime();
  if (time >= startOfToday) return "Today";
  if (time >= startOfToday - 86_400_000) return "Yesterday";
  if (time >= startOfToday - 6 * 86_400_000) return "This Week";
  if (time >= startOfToday - 30 * 86_400_000) return "This Month";
  return "Older";
}
