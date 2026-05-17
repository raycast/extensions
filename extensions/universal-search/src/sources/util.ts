import { spawn } from "child_process";
import { homedir } from "os";
import path from "path";
import type { ResultKind } from "../types";

export function tildify(p: string): string {
  const home = homedir();
  return p.startsWith(home) ? "~" + p.slice(home.length) : p;
}

export function untildify(p: string): string {
  if (p.startsWith("~/")) return homedir() + p.slice(1);
  if (p === "~") return homedir();
  return p;
}

/** Run a command and collect stdout. Rejects on AbortSignal or non-zero exit. */
export function run(cmd: string, args: string[], signal: AbortSignal, maxBytes = 1_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error("aborted"));
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    let truncated = false;
    const onAbort = () => {
      child.kill("SIGTERM");
      reject(new Error("aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });

    child.stdout.on("data", (chunk: Buffer) => {
      if (truncated) return;
      out += chunk.toString("utf8");
      if (out.length > maxBytes) {
        truncated = true;
        child.kill("SIGTERM");
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      err += chunk.toString("utf8");
    });
    child.on("error", (e) => {
      signal.removeEventListener("abort", onAbort);
      reject(e);
    });
    child.on("close", (code) => {
      signal.removeEventListener("abort", onAbort);
      if (code !== 0 && !truncated) {
        reject(new Error(`${cmd} exited ${code}: ${err.trim() || "(no stderr)"}`));
      } else {
        resolve(out);
      }
    });
  });
}

/** Run a command, write `input` to stdin, collect stdout. */
export function runWithStdin(
  cmd: string,
  args: string[],
  input: Buffer,
  signal: AbortSignal,
  maxBytes = 1_000_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error("aborted"));
    const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    let truncated = false;
    const onAbort = () => {
      child.kill("SIGTERM");
      reject(new Error("aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    child.stdout.on("data", (chunk: Buffer) => {
      if (truncated) return;
      out += chunk.toString("utf8");
      if (out.length > maxBytes) {
        truncated = true;
        child.kill("SIGTERM");
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      err += chunk.toString("utf8");
    });
    child.on("error", (e) => {
      signal.removeEventListener("abort", onAbort);
      reject(e);
    });
    child.on("close", (code) => {
      signal.removeEventListener("abort", onAbort);
      if (code !== 0 && !truncated) {
        reject(new Error(`${cmd} exited ${code}: ${err.trim() || "(no stderr)"}`));
      } else {
        resolve(out);
      }
    });
    child.stdin.on("error", () => {
      /* ignore EPIPE if child exited early */
    });
    child.stdin.write(input);
    child.stdin.end();
  });
}

/** Parsed search query: AND-terms / quoted phrases plus optional file-extension filters. */
export type ParsedQuery = {
  raw: string;
  /** Query with any recognized leading type filter removed. */
  search: string;
  /** Words or quoted phrases that must all appear (case-insensitive) in the haystack. */
  terms: string[];
  /** Extension filters (lowercase, no leading dot). Empty = no extension constraint. */
  extensions: string[];
  /** Source kinds selected by a recognized leading type filter. Empty = all kinds. */
  kinds: ResultKind[];
};

const TYPE_ALIASES: Record<string, ResultKind> = {
  app: "application",
  apps: "application",
  application: "application",
  applications: "application",
  content: "file-content",
  contents: "file-content",
  "file content": "file-content",
  "file contents": "file-content",
  filecontent: "file-content",
  filecontents: "file-content",
  "file-content": "file-content",
  filename: "file",
  filenames: "file",
  "file name": "file",
  "file names": "file",
  folder: "folder",
  folders: "folder",
  note: "note",
  notes: "note",
  obsidian: "note",
  "obsidian vault": "note",
  bookmark: "bookmark",
  bookmarks: "bookmark",
  safari: "bookmark",
  "safari bookmark": "bookmark",
  "safari bookmarks": "bookmark",
  contact: "contact",
  contacts: "contact",
  event: "event",
  events: "event",
  calendar: "event",
  calendars: "event",
  photo: "photo",
  photos: "photo",
  image: "photo",
  images: "photo",
  "photos app": "photo",
  script: "script-command",
  scripts: "script-command",
  command: "script-command",
  commands: "script-command",
  "script command": "script-command",
  "script commands": "script-command",
  raycast: "script-command",
  "raycast script": "script-command",
  "raycast scripts": "script-command",
};

function normalizeTypeFilter(s: string): string {
  return s.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function resolveTypeFilter(raw: string): ResultKind | undefined {
  return TYPE_ALIASES[normalizeTypeFilter(raw)];
}

function parseTypePrefix(raw: string): { search: string; kinds: ResultKind[] } {
  const prefix = raw.match(/^\s*([^:]{1,80})\s*:\s*(.*)$/s);
  if (!prefix) return { search: raw, kinds: [] };

  const kinds: ResultKind[] = [];
  const seen = new Set<ResultKind>();
  for (const part of prefix[1].split(",")) {
    const kind = resolveTypeFilter(part);
    if (!kind) return { search: raw, kinds: [] };
    if (!seen.has(kind)) {
      kinds.push(kind);
      seen.add(kind);
    }
  }
  return kinds.length > 0 ? { search: prefix[2], kinds } : { search: raw, kinds: [] };
}

function tokenizeSearch(search: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (const ch of search) {
    if (quote) {
      if (ch === quote) {
        if (current.trim()) tokens.push(current.trim());
        current = "";
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      if (current.trim()) tokens.push(current.trim());
      current = "";
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current.trim()) tokens.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

/** Leading type filters (`Application: iterm`, `Application,Script: clipboard`) narrow sources. Tokens that start with `.` are extension filters (`.pdf` → "pdf"). Quoted phrases are exact substring terms, so `"general only"` requires those words together. All unquoted whitespace-separated tokens are AND-matched terms. */
export function parseQuery(raw: string): ParsedQuery {
  const { search, kinds } = parseTypePrefix(raw);
  const tokens = tokenizeSearch(search);
  const terms: string[] = [];
  const extensions: string[] = [];
  for (const t of tokens) {
    if (t.length > 1 && t.startsWith(".")) extensions.push(t.slice(1).toLowerCase());
    else terms.push(t);
  }
  return { raw, search, terms, extensions, kinds };
}

export function matchesAllTerms(text: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const lower = text.toLowerCase();
  for (const t of terms) if (!lower.includes(t.toLowerCase())) return false;
  return true;
}

export function fileExt(filePath: string): string {
  return (filePath.match(/\.([^./\\]+)$/)?.[1] ?? "").toLowerCase();
}

export function matchesExtension(filePath: string, extensions: string[]): boolean {
  if (extensions.length === 0) return true;
  return extensions.includes(fileExt(filePath));
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Parse a comma- (or newline-) separated list. Trims, drops empties. */
export function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse a path-exclusion list: untildify and trim trailing slashes. */
export function parsePathExcludes(raw: string | undefined): string[] {
  return parseList(raw).map((p) => {
    const u = untildify(p);
    return u.endsWith("/") ? u.slice(0, -1) : u;
  });
}

/** Parse path excludes relative to a base path unless they are absolute or home-relative. */
export function parsePathExcludesRelativeTo(raw: string | undefined, basePath: string | undefined): string[] {
  return parseList(raw).map((p) => {
    const expanded = untildify(p);
    const resolved = path.isAbsolute(expanded) || !basePath ? expanded : path.join(basePath, expanded);
    return resolved.endsWith("/") ? resolved.slice(0, -1) : resolved;
  });
}

/** True if `target` is equal to or inside any of the excluded path prefixes. macOS-style case-insensitive. */
export function isExcludedPath(target: string, excludes: string[]): boolean {
  if (excludes.length === 0) return false;
  const t = path.resolve(target).toLowerCase();
  for (const ex of excludes) {
    const e = path.resolve(ex).toLowerCase();
    if (t === e || t.startsWith(e + path.sep)) return true;
  }
  return false;
}

/** True if any substring (case-insensitive) appears in target. */
export function matchesAny(target: string, needles: string[]): boolean {
  if (needles.length === 0) return false;
  const t = target.toLowerCase();
  for (const n of needles) {
    if (t.includes(n.toLowerCase())) return true;
  }
  return false;
}

export function shortenPath(p: string, max = 60): string {
  const t = tildify(p);
  if (t.length <= max) return t;
  const parts = t.split("/");
  if (parts.length <= 3) return t;
  return parts[0] + "/…/" + parts.slice(-2).join("/");
}
