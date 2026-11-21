import { promises as fs } from "fs";
import { basename, dirname, extname, join, relative } from "path";

export interface VaultFile {
  path: string;
  relativePath: string;
  name: string;
  folder: string;
  extension: string;
  modifiedAt: number;
  size: number;
}

export interface SearchResult {
  file: VaultFile;
  nameMatch: boolean;
  snippet?: string;
  line?: number;
}

const IGNORED_DIRECTORIES = new Set(["node_modules", ".git", ".obsidian", ".trash"]);
const TEXT_EXTENSIONS = new Set(["md", "markdown", "mdx", "txt", "text", "org", "json", "yaml", "yml", "csv"]);
const MAX_CONTENT_BYTES = 2 * 1024 * 1024;
const MAX_CONTENT_RESULTS = 200;
const READ_CONCURRENCY = 32;

export function parseExtensions(value: string | undefined): Set<string> {
  const extensions = (value ?? "")
    .split(",")
    .map((extension) => extension.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);
  return new Set(extensions);
}

export async function listVaultFiles(root: string, extensions: Set<string>): Promise<VaultFile[]> {
  const files: VaultFile[] = [];

  async function walk(directory: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    await Promise.all(
      entries.map(async (entry) => {
        if (entry.name.startsWith(".")) return;
        const fullPath = join(directory, entry.name);
        if (entry.isDirectory()) {
          if (!IGNORED_DIRECTORIES.has(entry.name)) await walk(fullPath);
          return;
        }
        if (!entry.isFile()) return;

        const extension = extname(entry.name).slice(1).toLowerCase();
        if (extensions.size > 0 && !extensions.has(extension)) return;

        try {
          const stat = await fs.stat(fullPath);
          const relativePath = relative(root, fullPath);
          const folder = dirname(relativePath);
          files.push({
            path: fullPath,
            relativePath,
            name: basename(entry.name, extname(entry.name)).normalize("NFC"),
            folder: folder === "." ? "" : folder.normalize("NFC"),
            extension,
            modifiedAt: stat.mtimeMs,
            size: stat.size,
          });
        } catch {
          // File disappeared or is unreadable; skip it.
        }
      }),
    );
  }

  await walk(root);
  return files.sort((a, b) => b.modifiedAt - a.modifiedAt);
}

const contentCache = new Map<string, { modifiedAt: number; text: string; lower: string }>();

async function readContent(file: VaultFile): Promise<{ text: string; lower: string } | null> {
  if (!TEXT_EXTENSIONS.has(file.extension) || file.size > MAX_CONTENT_BYTES) return null;
  const cached = contentCache.get(file.path);
  if (cached && cached.modifiedAt === file.modifiedAt) return cached;
  try {
    const text = (await fs.readFile(file.path, "utf8")).normalize("NFC");
    const entry = { modifiedAt: file.modifiedAt, text, lower: text.toLowerCase() };
    contentCache.set(file.path, entry);
    return entry;
  } catch {
    return null;
  }
}

export async function readFilePreview(file: VaultFile, maxLength = 20_000): Promise<string> {
  const content = await readContent(file);
  if (!content) return `*No preview available for \`.${file.extension}\` files.*`;
  return content.text.length > maxLength ? `${content.text.slice(0, maxLength)}\n\n…` : content.text;
}

function normalize(value: string): string {
  return value.normalize("NFC").toLowerCase();
}

function queryTerms(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

function buildSnippet(text: string, lower: string, term: string): { snippet: string; line: number } {
  const index = lower.indexOf(term);
  const lineStart = text.lastIndexOf("\n", index) + 1;
  const lineEndIndex = text.indexOf("\n", index);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
  const line = text.slice(0, index).split("\n").length;

  let snippet = text.slice(lineStart, lineEnd).trim();
  if (snippet.length > 140) {
    const offset = index - lineStart;
    const start = Math.max(0, offset - 50);
    snippet = `${start > 0 ? "…" : ""}${text.slice(lineStart + start, lineStart + start + 140).trim()}…`;
  }
  return { snippet: snippet.replace(/\s+/g, " "), line };
}

function foldForMatching(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function isBoundary(target: string, index: number): boolean {
  if (index === 0) return true;
  return /[\s/_\-.()[\]]/.test(target[index - 1]);
}

/**
 * Scores `term` against `target` (both already folded). Returns null when there is no acceptable match.
 * Exact substrings score highest; otherwise characters must appear in order (fzf-style subsequence),
 * with bonuses for consecutive characters and word boundaries.
 */
function matchScore(term: string, target: string, fuzzy: boolean): number | null {
  const substringIndex = target.indexOf(term);
  if (substringIndex !== -1) {
    return 1000 + term.length * 20 + (isBoundary(target, substringIndex) ? 100 : 0) - substringIndex;
  }
  if (!fuzzy || term.length < 2) return null;

  // Forward pass: find the earliest end of a subsequence match.
  let t = 0;
  let end = -1;
  for (let i = 0; i < target.length && t < term.length; i++) {
    if (target[i] === term[t]) {
      t++;
      if (t === term.length) end = i;
    }
  }
  if (end === -1) return null;

  // Backward pass: tighten the match to the shortest window ending at `end`.
  const positions: number[] = new Array(term.length);
  t = term.length - 1;
  for (let i = end; i >= 0 && t >= 0; i--) {
    if (target[i] === term[t]) positions[t--] = i;
  }

  let score = 0;
  let allStructured = true;
  for (let k = 0; k < positions.length; k++) {
    const consecutive = k > 0 && positions[k] === positions[k - 1] + 1;
    const boundary = isBoundary(target, positions[k]);
    score += 10 + (consecutive ? 15 : 0) + (boundary ? 20 : 0);
    if (k > 0) score -= Math.min(positions[k] - positions[k - 1] - 1, 10);
    if (!consecutive && !boundary && k > 0) allStructured = false;
  }

  // Reject scattered matches: fuzzy hits must start on a word boundary, short terms must
  // follow word boundaries (e.g. initials), and longer ones must stay reasonably compact.
  if (!isBoundary(target, positions[0])) return null;
  const span = positions[positions.length - 1] - positions[0] + 1;
  const maxSpan = term.length <= 3 ? term.length * 2 : term.length * 2 + 2;
  if (!allStructured && span > maxSpan) return null;
  return score;
}

function scoreFile(file: VaultFile, terms: string[], fuzzy: boolean): number | null {
  const name = foldForMatching(file.name);
  const path = foldForMatching(file.relativePath);
  let total = 0;
  for (const term of terms) {
    const nameScore = matchScore(term, name, fuzzy);
    const pathScore = matchScore(term, path, fuzzy);
    if (nameScore === null && pathScore === null) return null;
    // Matches in the file name weigh more than matches in parent folders.
    total += Math.max(nameScore === null ? -Infinity : nameScore * 1.5, pathScore ?? -Infinity);
  }
  return total;
}

export async function searchVaultFiles(
  files: VaultFile[],
  query: string,
  includeContent: boolean,
  fuzzy: boolean,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const terms = queryTerms(query);
  if (terms.length === 0) return files.slice(0, 100).map((file) => ({ file, nameMatch: false }));

  const foldedTerms = terms.map(foldForMatching);
  const scored: { result: SearchResult; score: number }[] = [];
  const remaining: VaultFile[] = [];
  for (const file of files) {
    const score = scoreFile(file, foldedTerms, fuzzy);
    if (score !== null) {
      scored.push({ result: { file, nameMatch: true }, score });
    } else {
      remaining.push(file);
    }
  }

  scored.sort((a, b) => b.score - a.score || b.result.file.modifiedAt - a.result.file.modifiedAt);
  const nameMatches = scored.map(({ result }) => result);

  if (!includeContent) return nameMatches;

  const contentMatches: SearchResult[] = [];
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < remaining.length && contentMatches.length < MAX_CONTENT_RESULTS) {
      if (signal?.aborted) return;
      const file = remaining[cursor++];
      const content = await readContent(file);
      if (!content || !terms.every((term) => content.lower.includes(term))) continue;
      const { snippet, line } = buildSnippet(content.text, content.lower, terms[0]);
      contentMatches.push({ file, nameMatch: false, snippet, line });
    }
  }

  await Promise.all(Array.from({ length: READ_CONCURRENCY }, worker));
  contentMatches.sort((a, b) => b.file.modifiedAt - a.file.modifiedAt);
  return [...nameMatches, ...contentMatches];
}
