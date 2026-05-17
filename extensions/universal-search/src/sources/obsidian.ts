import { readdir, readFile, realpath, stat } from "fs/promises";
import { fileToImageDataUrl, isImagePath } from "./images";
import path from "path";
import { SearchResult, SourceContext, SourceOutput } from "../types";
import { escapeRegex, isExcludedPath, matchesAllTerms, parseQuery, run } from "./util";

const SKIP_DIRS = new Set([".obsidian", ".trash", ".git", "node_modules"]);

/** basename(lowercased) → absolute path. Per-vault. Lazy. */
const attachmentIndex = new Map<string, Map<string, string>>();
const attachmentIndexBuilding = new Map<string, Promise<Map<string, string>>>();

async function walkAll(
  dir: string,
  out: Map<string, string>,
  seen: Set<string>,
  vaultPath: string,
  limit = 20000,
): Promise<void> {
  if (out.size >= limit) return;
  let real: string;
  try {
    real = await realpath(dir);
  } catch {
    return;
  }
  if (seen.has(real)) return;
  seen.add(real);
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (out.size >= limit) return;
    if (e.name.startsWith(".") && SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    let isDir = e.isDirectory();
    let isFile = e.isFile();
    if (e.isSymbolicLink()) {
      try {
        const s = await stat(full);
        isDir = s.isDirectory();
        isFile = s.isFile();
      } catch {
        continue;
      }
    }
    if (isDir) {
      if (SKIP_DIRS.has(e.name)) continue;
      await walkAll(full, out, seen, vaultPath, limit);
    } else if (isFile) {
      const key = e.name.toLowerCase();
      if (!out.has(key)) out.set(key, full);
      const stem = key.replace(/\.[^.]+$/, "");
      if (!out.has(stem)) out.set(stem, full);
    }
  }
}

async function getAttachmentIndex(vaultPath: string): Promise<Map<string, string>> {
  const existing = attachmentIndex.get(vaultPath);
  if (existing) return existing;
  const inflight = attachmentIndexBuilding.get(vaultPath);
  if (inflight) return inflight;
  const p = (async () => {
    const map = new Map<string, string>();
    await walkAll(vaultPath, map, new Set<string>(), vaultPath);
    attachmentIndex.set(vaultPath, map);
    attachmentIndexBuilding.delete(vaultPath);
    return map;
  })();
  attachmentIndexBuilding.set(vaultPath, p);
  return p;
}

/** Resolve an Obsidian embed/link target (with optional anchor and size) to a path. */
export async function resolveAttachment(name: string, vaultPath: string): Promise<string | null> {
  const cleaned = name.split("|")[0].split("#")[0].trim();
  if (!cleaned) return null;
  const idx = await getAttachmentIndex(vaultPath);
  return idx.get(cleaned.toLowerCase()) ?? idx.get(cleaned.toLowerCase().replace(/\.[^.]+$/, "")) ?? null;
}

async function resolveTargetToImageDataUrl(
  target: string,
  vaultPath: string | undefined,
  notePath: string | undefined,
): Promise<string | null> {
  // 1. Try as a relative path from the note's directory.
  if (notePath) {
    const abs = path.isAbsolute(target) ? target : path.resolve(path.dirname(notePath), target);
    if (isImagePath(abs)) {
      const d = await fileToImageDataUrl(abs);
      if (d) return d;
    }
  }
  // 2. Try as an absolute path.
  if (path.isAbsolute(target) && isImagePath(target)) {
    const d = await fileToImageDataUrl(target);
    if (d) return d;
  }
  // 3. Try resolving by basename against the vault-wide attachment index.
  if (vaultPath) {
    const resolved = await resolveAttachment(target, vaultPath);
    if (resolved && isImagePath(resolved)) {
      const d = await fileToImageDataUrl(resolved);
      if (d) return d;
    }
  }
  return null;
}

/** Rewrite Obsidian-flavoured embeds and standard markdown images / wikilinks to inline previews. */
export async function rewriteObsidianMarkdown(text: string, vaultPath?: string, notePath?: string): Promise<string> {
  let out = text;

  // 1. Obsidian image / file embeds: ![[target]] or ![[target|size]]
  const embedRe = /!\[\[([^\]]+)\]\]/g;
  const embedMatches = [...out.matchAll(embedRe)];
  if (embedMatches.length > 0) {
    const repl = await Promise.all(
      embedMatches.map(async (m) => {
        const target = m[1].split("|")[0].split("#")[0].trim();
        const dataUrl = await resolveTargetToImageDataUrl(target, vaultPath, notePath);
        if (dataUrl) return { from: m[0], to: `![](${dataUrl})` };
        return { from: m[0], to: `*[[${m[1]}]]*` };
      }),
    );
    for (const r of repl) out = out.split(r.from).join(r.to);
  }

  // 2. Standard markdown images: ![alt](url) — rewrite relative / vault paths to data URLs.
  const imgRe = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const imgMatches = [...out.matchAll(imgRe)];
  if (imgMatches.length > 0) {
    const repl = await Promise.all(
      imgMatches.map(async (m) => {
        const url = m[2];
        // Leave already-inline data URLs and http(s) URLs alone.
        if (/^(data:|https?:|file:)/i.test(url)) return null;
        const decoded = decodeURI(url);
        const dataUrl = await resolveTargetToImageDataUrl(decoded, vaultPath, notePath);
        if (dataUrl) return { from: m[0], to: `![${m[1]}](${dataUrl})` };
        return { from: m[0], to: `_(image unavailable: ${m[1] || decoded})_` };
      }),
    );
    for (const r of repl) if (r) out = out.split(r.from).join(r.to);
  }

  // 3. Plain wikilinks: [[note]] or [[note|alias]] → italic alias / name.
  out = out.replace(/\[\[([^\]]+)\]\]/g, (_m, inner) => {
    const parts = String(inner).split("|");
    return `*${parts[parts.length - 1].split("#")[0].trim()}*`;
  });
  return out;
}

async function walk(
  dir: string,
  signal: AbortSignal,
  out: string[],
  seen: Set<string>,
  limitFiles = 5000,
): Promise<void> {
  if (signal.aborted || out.length >= limitFiles) return;
  let real: string;
  try {
    real = await realpath(dir);
  } catch {
    return;
  }
  if (seen.has(real)) return;
  seen.add(real);

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (signal.aborted || out.length >= limitFiles) return;
    if (e.name.startsWith(".") && SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);

    // Resolve symlinks: follow into directories, include .md targets as files.
    let isDir = e.isDirectory();
    let isFile = e.isFile();
    if (e.isSymbolicLink()) {
      try {
        const s = await stat(full);
        isDir = s.isDirectory();
        isFile = s.isFile();
      } catch {
        continue;
      }
    }

    if (isDir) {
      if (SKIP_DIRS.has(e.name)) continue;
      await walk(full, signal, out, seen, limitFiles);
    } else if (isFile && e.name.toLowerCase().endsWith(".md")) {
      out.push(full);
    }
  }
}

/** Use ripgrep to find files containing all terms (AND). Returns null if rg is unavailable. */
async function rgFilesWithAllTerms(
  vaultPath: string,
  terms: string[],
  signal: AbortSignal,
): Promise<Set<string> | null> {
  if (terms.length === 0) return null;
  try {
    let candidates: Set<string> | null = null;
    for (const term of terms) {
      const out = await run(
        "rg",
        ["--files-with-matches", "--ignore-case", "--glob", "*.md", "--fixed-strings", "--", term, vaultPath],
        signal,
        20_000_000,
      );
      const set = new Set<string>(out.split("\n").filter(Boolean));
      if (candidates === null) {
        candidates = set;
      } else {
        const intersected = new Set<string>();
        for (const f of candidates) if (set.has(f)) intersected.add(f);
        candidates = intersected;
      }
      if (candidates.size === 0) return candidates;
    }
    return candidates;
  } catch {
    return null;
  }
}

export async function searchObsidian(ctx: SourceContext): Promise<SourceOutput> {
  const empty = { results: [] as SearchResult[], total: 0 };
  if (!ctx.vaultPath) return empty;
  const parsed = parseQuery(ctx.query);
  // Notes are .md only — if an extension filter is set and it's not md/markdown, skip the source.
  if (parsed.extensions.length > 0 && !parsed.extensions.some((e) => e === "md" || e === "markdown")) return empty;
  if (parsed.terms.length === 0 && parsed.extensions.length === 0) return empty;

  const files: string[] = [];
  await walk(ctx.vaultPath, ctx.signal, files, new Set<string>());
  if (ctx.signal.aborted) return empty;

  // Use ripgrep (when available) to pre-filter files that contain every term; falls back to scanning every file.
  const rgCandidates = await rgFilesWithAllTerms(ctx.vaultPath, parsed.terms, ctx.signal);

  const previewRe = parsed.terms[0] ? new RegExp(escapeRegex(parsed.terms[0]), "i") : null;

  const nameMatches: SearchResult[] = [];
  const contentMatches: SearchResult[] = [];
  let total = 0;
  // Stop after a multiple of the display limit to keep the search responsive on huge vaults.
  const SCAN_CAP = ctx.limit * 20;
  let truncated = false;

  const excludes = ctx.exclude ?? [];
  for (const file of files) {
    if (ctx.signal.aborted) break;
    if (total >= SCAN_CAP) {
      truncated = true;
      break;
    }
    if (isExcludedPath(file, excludes)) continue;
    const base = path.basename(file, ".md");
    const rel = path.relative(ctx.vaultPath, file);
    const nameHit = parsed.terms.length > 0 && matchesAllTerms(base, parsed.terms);

    let preview: string | undefined;
    let lineNo: number | undefined;
    let contentHit = false;
    if (parsed.terms.length > 0 && !nameHit) {
      // ripgrep already told us which files contain every term — skip the rest entirely.
      if (rgCandidates !== null) {
        if (!rgCandidates.has(file)) continue;
        contentHit = true;
        if (previewRe) {
          try {
            const content = await readFile(file, "utf8");
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (previewRe.test(lines[i])) {
                preview = lines[i].trim().slice(0, 200);
                lineNo = i + 1;
                break;
              }
            }
          } catch {
            // ignore
          }
        }
      } else {
        try {
          const content = await readFile(file, "utf8");
          contentHit = matchesAllTerms(content, parsed.terms);
          if (contentHit && previewRe) {
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (previewRe.test(lines[i])) {
                preview = lines[i].trim().slice(0, 200);
                lineNo = i + 1;
                break;
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }

    // Extension-only query (.md): include every note.
    const extensionOnly = parsed.terms.length === 0 && parsed.extensions.length > 0;
    if (!nameHit && !contentHit && !extensionOnly) continue;

    total++;
    if (nameMatches.length + contentMatches.length >= ctx.limit) continue;

    const id = "note:" + file;
    const result: SearchResult = {
      id,
      kind: "note",
      title: base,
      subtitle: path.dirname(rel) === "." ? "" : path.dirname(rel),
      path: file,
      matchPreview: preview,
      matchLine: lineNo,
    };

    try {
      const s = await stat(file);
      result.modifiedAt = s.mtimeMs;
      result.size = s.size;
    } catch {
      // ignore
    }

    (nameHit ? nameMatches : contentMatches).push(result);
  }

  return { results: [...nameMatches, ...contentMatches].slice(0, ctx.limit), total, truncated };
}
