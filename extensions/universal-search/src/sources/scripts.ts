import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { SearchResult, SourceContext, SourceOutput } from "../types";
import { fileExt, isExcludedPath, matchesAllTerms, parseQuery, untildify } from "./util";

const SKIP_DIRS = new Set([".git", ".github", "node_modules", ".venv", "__pycache__"]);
const MAX_FILES = 2000;
const MAX_HEADER_BYTES = 16_000;

type ScriptCommand = {
  path: string;
  title: string;
  description?: string;
  packageName?: string;
  mode?: string;
  schemaVersion?: string;
  argumentCount: number;
  modifiedAt?: number;
  size?: number;
};

let cache: { root: string; at: number; commands: ScriptCommand[] } | null = null;
const CACHE_TTL_MS = 15_000;

function parseHeader(text: string): Record<string, string[]> {
  const meta: Record<string, string[]> = {};
  for (const line of text.split("\n").slice(0, 80)) {
    const m = line.match(/^\s*(?:#|\/\/|--|;|%)\s*@raycast\.([A-Za-z0-9_-]+)\s+(.+?)\s*$/);
    if (!m) continue;
    const key = m[1];
    meta[key] = [...(meta[key] ?? []), m[2].trim()];
  }
  return meta;
}

function fallbackTitle(filePath: string): string {
  const parsed = path.parse(filePath);
  return parsed.name
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isPotentialScript(filePath: string): boolean {
  const ext = fileExt(filePath);
  return !ext || ["applescript", "js", "mjs", "py", "rb", "sh", "swift", "ts", "zsh"].includes(ext);
}

async function walk(dir: string, out: string[], signal: AbortSignal): Promise<void> {
  if (signal.aborted || out.length >= MAX_FILES) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (signal.aborted || out.length >= MAX_FILES) return;
    if (entry.name.startsWith(".") && entry.name !== ".raycast") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(full, out, signal);
      continue;
    }
    if (!entry.isFile() || !isPotentialScript(full)) continue;
    out.push(full);
  }
}

async function readScriptCommand(filePath: string): Promise<ScriptCommand | undefined> {
  let s;
  try {
    s = await stat(filePath);
    if (!s.isFile()) return undefined;
  } catch {
    return undefined;
  }

  let content: string;
  try {
    content = (await readFile(filePath)).subarray(0, MAX_HEADER_BYTES).toString("utf8");
  } catch {
    return undefined;
  }

  const meta = parseHeader(content);
  const title = meta.title?.[0] || fallbackTitle(filePath);
  const argumentCount = Object.keys(meta).filter((key) => /^argument\d+$/i.test(key)).length;
  return {
    path: filePath,
    title,
    description: meta.description?.[0],
    packageName: meta.packageName?.[0],
    mode: meta.mode?.[0],
    schemaVersion: meta.schemaVersion?.[0],
    argumentCount,
    modifiedAt: s.mtimeMs,
    size: s.size,
  };
}

async function loadScriptCommands(root: string, signal: AbortSignal): Promise<ScriptCommand[]> {
  const resolvedRoot = path.resolve(untildify(root));
  if (cache && cache.root === resolvedRoot && Date.now() - cache.at < CACHE_TTL_MS) return cache.commands;

  const files: string[] = [];
  await walk(resolvedRoot, files, signal);
  const commands: ScriptCommand[] = [];
  for (const file of files) {
    if (signal.aborted) return [];
    const cmd = await readScriptCommand(file);
    if (cmd) commands.push(cmd);
  }
  cache = { root: resolvedRoot, at: Date.now(), commands };
  return commands;
}

export async function searchScriptCommands(ctx: SourceContext): Promise<SourceOutput> {
  const scriptCommandsPath = ctx.scriptCommandsPath?.trim();
  if (!scriptCommandsPath) return { results: [], total: 0 };

  const parsed = parseQuery(ctx.query);
  if (parsed.extensions.length > 0) return { results: [], total: 0 };
  if (parsed.terms.length === 0) return { results: [], total: 0 };

  const commands = await loadScriptCommands(scriptCommandsPath, ctx.signal);
  const excludes = ctx.exclude ?? [];
  const results: SearchResult[] = [];
  let total = 0;

  for (const command of commands) {
    if (ctx.signal.aborted) return { results: [], total: 0 };
    if (isExcludedPath(command.path, excludes)) continue;
    const hay = [
      command.title,
      command.description ?? "",
      command.packageName ?? "",
      command.mode ?? "",
      path.basename(command.path),
      command.path,
    ].join(" ");
    if (!matchesAllTerms(hay, parsed.terms)) continue;
    total++;
    if (results.length >= ctx.limit) continue;
    results.push({
      id: "script:" + command.path,
      kind: "script-command",
      title: command.title,
      subtitle: command.packageName || command.description || path.dirname(command.path),
      path: command.path,
      modifiedAt: command.modifiedAt,
      size: command.size,
      scriptMode: command.mode,
      scriptPackageName: command.packageName,
      scriptDescription: command.description,
      scriptSchemaVersion: command.schemaVersion,
      scriptArgumentCount: command.argumentCount,
    });
  }

  return { results, total };
}
