import { readdirSync, statSync } from "fs";
import { join } from "path";

export interface Note {
  /** Vault-relative path, e.g. "Projects/Plan.md". */
  path: string;
  name: string;
  /** Vault-relative folder, "" for the vault root. */
  folder: string;
  /** Text for `[[…]]`: the note name, or its path (without .md) when another note has the same name. */
  link: string;
}

/**
 * Where a `[[` was just typed: compares the field's previous and next value and returns the index of
 * that `[[` in `next`, or undefined when the edit didn't end in a new `[[`.
 */
export function linkTriggerAt(prev: string, next: string): number | undefined {
  if (next.length <= prev.length) return undefined;
  let start = 0;
  while (start < prev.length && prev[start] === next[start]) start++;
  let tail = 0;
  while (tail < prev.length - start && prev[prev.length - 1 - tail] === next[next.length - 1 - tail]) tail++;
  const end = next.length - tail;
  return end >= 2 && next.slice(end - 2, end) === "[[" ? end - 2 : undefined;
}

/** Replace the `[[` at `start` with a finished `[[link]]`. */
export function insertLink(value: string, start: number, link: string): string {
  return `${value.slice(0, start)}[[${link}]]${value.slice(start + 2)}`;
}

/** Markdown notes in the vault, most recently modified first (hidden folders such as .obsidian are skipped). */
export function listNotes(vaultPath: string): Note[] {
  const found: { path: string; mtime: number }[] = [];
  const walk = (relative: string) => {
    let entries;
    try {
      entries = readdirSync(join(vaultPath, relative), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          found.push({ path, mtime: statSync(join(vaultPath, path)).mtimeMs });
        } catch {
          // Removed or unreadable since the directory was read (e.g. during a sync): skip it.
        }
      }
    }
  };
  walk("");

  const nameCounts = new Map<string, number>();
  const nameOf = (path: string) => path.slice(path.lastIndexOf("/") + 1, -".md".length);
  for (const { path } of found) nameCounts.set(nameOf(path), (nameCounts.get(nameOf(path)) ?? 0) + 1);

  return found
    .sort((a, b) => b.mtime - a.mtime)
    .map(({ path }) => {
      const name = nameOf(path);
      const slash = path.lastIndexOf("/");
      return {
        path,
        name,
        folder: slash === -1 ? "" : path.slice(0, slash),
        link: (nameCounts.get(name) ?? 0) > 1 ? path.slice(0, -".md".length) : name,
      };
    });
}

/** Something `[[` can link to: a note, another file (canvas, PDF, image…) or a note's alias. */
export interface LinkTarget {
  id: string;
  title: string;
  subtitle: string;
  /** Text inside `[[…]]`. */
  link: string;
  kind: "note" | "file" | "alias";
}

export function notesToTargets(notes: Note[]): LinkTarget[] {
  return notes.map((note) => ({
    id: note.path,
    title: note.name,
    subtitle: note.folder,
    link: note.link,
    kind: "note",
  }));
}

/** `obsidian-cli files` prints one raw vault path per line (names are not quoted). */
export function parseFileList(stdout: string): string[] {
  return stdout
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.trim() !== "" && !/^No .+ found\.$/.test(line));
}

/** `obsidian-cli aliases verbose` prints `alias<TAB>path` lines. */
export function parseAliases(stdout: string): { alias: string; path: string }[] {
  return stdout
    .split("\n")
    .map((line) => line.replace(/\r$/, "").split("\t"))
    .filter((parts) => parts.length === 2 && parts[0] !== "" && parts[1] !== "")
    .map(([alias, path]) => ({ alias, path }));
}

/** Tags from `obsidian-cli tags counts format=json` (wrapped as `{ items }` by the CLI helper). */
export function parseTags(data: Record<string, unknown>): { tag: string; count: number }[] {
  const items = Array.isArray(data.items) ? (data.items as { tag?: unknown; count?: unknown }[]) : [];
  return items
    .filter((item) => typeof item?.tag === "string")
    .map((item) => ({ tag: (item.tag as string).replace(/^#/, ""), count: Number(item.count) || 0 }));
}

/**
 * Link targets from Obsidian's own file and alias lists, newest first. Notes link by name (by path when
 * names clash, Obsidian's "shortest path" format); other files keep their extension; aliases become
 * `[[note|alias]]`.
 */
export function obsidianLinkTargets(
  paths: string[],
  aliases: { alias: string; path: string }[],
  mtimeOf: (path: string) => number,
): LinkTarget[] {
  const split = (path: string) => {
    const slash = path.lastIndexOf("/");
    const file = path.slice(slash + 1);
    const isNote = file.endsWith(".md");
    return { folder: slash === -1 ? "" : path.slice(0, slash), isNote, key: isNote ? file.slice(0, -3) : file };
  };
  const counts = new Map<string, number>();
  for (const path of paths) {
    const { isNote, key } = split(path);
    const id = `${isNote}:${key}`;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const linkOf = (path: string) => {
    const { isNote, key } = split(path);
    const clash = (counts.get(`${isNote}:${key}`) ?? 0) > 1;
    return clash ? (isNote ? path.slice(0, -3) : path) : key;
  };
  const aliasesByPath = new Map<string, string[]>();
  for (const { alias, path } of aliases) aliasesByPath.set(path, [...(aliasesByPath.get(path) ?? []), alias]);

  const sorted = paths.map((path) => ({ path, mtime: mtimeOf(path) })).sort((a, b) => b.mtime - a.mtime);
  const targets: LinkTarget[] = [];
  for (const { path } of sorted) {
    const { folder, isNote, key } = split(path);
    const link = linkOf(path);
    targets.push({ id: path, title: key, subtitle: folder, link, kind: isNote ? "note" : "file" });
    for (const alias of aliasesByPath.get(path) ?? []) {
      targets.push({
        id: `${path}#alias:${alias}`,
        title: alias,
        subtitle: `→ ${isNote ? path.slice(0, -3) : path}`,
        link: `${link}|${alias}`,
        kind: "alias",
      });
    }
  }
  return targets;
}

/** Where a tag-starting `#` was just typed (at the start or after whitespace), or undefined. */
export function hashTriggerAt(prev: string, next: string): number | undefined {
  if (next.length !== prev.length + 1) return undefined;
  let at = 0;
  while (at < prev.length && prev[at] === next[at]) at++;
  if (next[at] !== "#" || prev.slice(at) !== next.slice(at + 1)) return undefined;
  return at === 0 || /\s/.test(next[at - 1]) ? at : undefined;
}

/** Replace the `#` at `start` with `#tag`. */
export function insertTag(value: string, start: number, tag: string): string {
  return `${value.slice(0, start)}#${tag}${value.slice(start + 1)}`;
}

/** File types Obsidian opens itself (and so offers after `[[`), per its "Files and links" defaults. */
const OBSIDIAN_EXTENSIONS = new Set([
  "md",
  "canvas",
  "base",
  "pdf",
  ...["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"],
  ...["3gp", "flac", "m4a", "mp3", "ogg", "wav"],
  ...["mkv", "mov", "mp4", "ogv", "webm"],
]);

export interface FileSettings {
  /** "Detect all file extensions". */
  showUnsupportedFiles?: boolean;
  /** "Excluded files": path prefixes, or `/regex/`. */
  userIgnoreFilters?: string[];
}

/** The files Obsidian's own `[[` suggester would offer, given the vault's file settings. */
export function linkableFiles(paths: string[], settings: FileSettings): string[] {
  const filters = (settings.userIgnoreFilters ?? []).map((filter) => {
    const regex = /^\/(.*)\/$/.exec(filter);
    if (!regex) return (path: string) => path.startsWith(filter);
    try {
      const pattern = new RegExp(regex[1]);
      return (path: string) => pattern.test(path);
    } catch {
      return () => false;
    }
  });
  return paths.filter((path) => {
    if (filters.some((excluded) => excluded(path))) return false;
    if (settings.showUnsupportedFiles) return true;
    const dot = path.lastIndexOf(".");
    return dot > path.lastIndexOf("/") && OBSIDIAN_EXTENSIONS.has(path.slice(dot + 1).toLowerCase());
  });
}
