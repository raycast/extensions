import { realpathSync, readdirSync } from "fs";
import { stat, readFile } from "fs/promises";
import path from "path";
import { SearchResult, SourceContext, SourceOutput } from "../types";
import { escapeRegex, fileExt, isExcludedPath, parseQuery, run } from "./util";

const vaultRootsCache = new Map<string, string[]>();

/** Returns the lowercased realpath of the vault plus the realpaths of every
 *  symlinked top-level subdirectory inside it. Cached per vault. */
function getVaultRoots(vaultPath: string): string[] {
  const cached = vaultRootsCache.get(vaultPath);
  if (cached) return cached;
  const roots = new Set<string>();
  try {
    roots.add(realpathSync(vaultPath).toLowerCase());
  } catch {
    roots.add(path.resolve(vaultPath).toLowerCase());
  }
  try {
    for (const entry of readdirSync(vaultPath, { withFileTypes: true })) {
      if (!entry.isSymbolicLink()) continue;
      const full = path.join(vaultPath, entry.name);
      try {
        roots.add(realpathSync(full).toLowerCase());
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  const arr = [...roots];
  vaultRootsCache.set(vaultPath, arr);
  return arr;
}

function escapeMdfind(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function isInVault(p: string, vaultPath?: string): boolean {
  if (!vaultPath) return false;
  let target: string;
  try {
    target = realpathSync(p).toLowerCase();
  } catch {
    target = path.resolve(p).toLowerCase();
  }
  for (const root of getVaultRoots(vaultPath)) {
    if (target === root || target.startsWith(root + path.sep)) return true;
  }
  return false;
}

const SCAN_MULTIPLIER = 20;

async function mdfindLines(query: string, signal: AbortSignal, limit: number): Promise<string[]> {
  try {
    const out = await run("mdfind", ["-onlyin", process.env.HOME ?? "/", query], signal);
    return out
      .split("\n")
      .filter(Boolean)
      .slice(0, limit * SCAN_MULTIPLIER);
  } catch {
    return [];
  }
}

export async function searchFileNames(ctx: SourceContext): Promise<SourceOutput> {
  const parsed = parseQuery(ctx.query);
  if (parsed.terms.length === 0 && parsed.extensions.length === 0) return { results: [], total: 0 };
  const namePreds = parsed.terms.map((t) => `kMDItemDisplayName == "*${escapeMdfind(t)}*"cd`);
  const extPreds = parsed.extensions.map((e) => `kMDItemFSName == "*.${escapeMdfind(e)}"cd`);
  const preds = [...namePreds, ...extPreds, `kMDItemContentTypeTree != "public.folder"`];
  // When only extension filter is given, mdfind still needs a real predicate — add a wildcard name.
  if (namePreds.length === 0) preds.unshift(`kMDItemDisplayName == "*"`);
  const expr = preds.join(" && ");
  const paths = await mdfindLines(expr, ctx.signal, ctx.limit);
  const excludes = ctx.exclude ?? [];
  const results: SearchResult[] = [];
  let total = 0;
  for (const p of paths) {
    if (isInVault(p, ctx.vaultPath)) continue;
    if (isExcludedPath(p, excludes)) continue;
    if (total >= ctx.limit * SCAN_MULTIPLIER) break;
    if (parsed.extensions.length > 0 && !parsed.extensions.includes(fileExt(p))) continue;
    let modifiedAt: number | undefined;
    let size: number | undefined;
    try {
      const s = await stat(p);
      if (s.isDirectory()) continue;
      modifiedAt = s.mtimeMs;
      size = s.size;
    } catch {
      continue;
    }
    total++;
    if (results.length < ctx.limit) {
      results.push({
        id: "file:" + p,
        kind: "file",
        title: path.basename(p),
        subtitle: path.dirname(p),
        path: p,
        modifiedAt,
        size,
      });
    }
  }
  return { results, total };
}

export async function searchFileContents(ctx: SourceContext): Promise<SourceOutput> {
  const parsed = parseQuery(ctx.query);
  if (parsed.terms.length === 0 && parsed.extensions.length === 0) return { results: [], total: 0 };
  const termPreds = parsed.terms.map((t) => `kMDItemTextContent == "*${escapeMdfind(t)}*"cd`);
  const extPreds = parsed.extensions.map((e) => `kMDItemFSName == "*.${escapeMdfind(e)}"cd`);
  const preds = [...termPreds, ...extPreds, `kMDItemContentTypeTree != "public.folder"`];
  if (termPreds.length === 0) preds.unshift(`kMDItemFSName == "*"`);
  const expr = preds.join(" && ");
  const paths = await mdfindLines(expr, ctx.signal, ctx.limit);
  // Highlight regex uses the first term (or any if none) for the line preview.
  const previewNeedle = parsed.terms[0] ?? "";
  const re = previewNeedle ? new RegExp(escapeRegex(previewNeedle), "i") : null;
  const excludes = ctx.exclude ?? [];
  const results: SearchResult[] = [];
  let total = 0;

  for (const p of paths) {
    if (isInVault(p, ctx.vaultPath)) continue;
    if (isExcludedPath(p, excludes)) continue;
    if (total >= ctx.limit * SCAN_MULTIPLIER) break;
    if (parsed.extensions.length > 0 && !parsed.extensions.includes(fileExt(p))) continue;
    let modifiedAt: number | undefined;
    let size: number | undefined;
    try {
      const s = await stat(p);
      if (s.isDirectory()) continue;
      modifiedAt = s.mtimeMs;
      size = s.size;
    } catch {
      continue;
    }
    total++;
    if (results.length >= ctx.limit) continue;

    let preview: string | undefined;
    let lineNo: number | undefined;
    if (
      size !== undefined &&
      size < 2_000_000 &&
      /\.(txt|md|py|ts|tsx|js|jsx|json|yaml|yml|toml|html|css|sh|go|rs|java|kt|swift|c|cpp|h|hpp|sql|rb|php|xml|csv|log)$/i.test(
        p,
      )
    ) {
      if (re) {
        try {
          const content = await readFile(p, "utf8");
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i])) {
              preview = lines[i].trim().slice(0, 200);
              lineNo = i + 1;
              break;
            }
          }
        } catch {
          // ignore
        }
      }
    }

    results.push({
      id: "filec:" + p,
      kind: "file-content",
      title: path.basename(p),
      subtitle: path.dirname(p),
      path: p,
      matchPreview: preview,
      matchLine: lineNo,
      modifiedAt,
      size,
    });
  }
  return { results, total };
}

export async function searchFolders(ctx: SourceContext): Promise<SourceOutput> {
  const parsed = parseQuery(ctx.query);
  if (parsed.extensions.length > 0) return { results: [], total: 0 };
  if (parsed.terms.length === 0) return { results: [], total: 0 };
  const namePreds = parsed.terms.map((t) => `kMDItemDisplayName == "*${escapeMdfind(t)}*"cd`);
  const expr = [`kMDItemContentType == "public.folder"`, ...namePreds].join(" && ");
  const paths = await mdfindLines(expr, ctx.signal, ctx.limit);
  const excludes = ctx.exclude ?? [];
  const results: SearchResult[] = [];
  let total = 0;
  for (const p of paths) {
    if (isExcludedPath(p, excludes)) continue;
    let modifiedAt: number | undefined;
    try {
      const s = await stat(p);
      if (!s.isDirectory()) continue;
      modifiedAt = s.mtimeMs;
    } catch {
      continue;
    }
    total++;
    if (results.length >= ctx.limit) continue;
    results.push({
      id: "folder:" + p,
      kind: "folder",
      title: path.basename(p) || p,
      subtitle: path.dirname(p),
      path: p,
      modifiedAt,
    });
  }
  return { results, total };
}
