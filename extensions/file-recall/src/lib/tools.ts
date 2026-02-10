import {
  ToolDefinition,
  RankedFileResult,
  AgentResult,
  FileResult,
} from "./types";
import {
  runMdfind,
  pathsToResults,
  pathsToResultsPage,
  findDirectories,
} from "./file-search";
import { analyzeImage as analyzeImageLLM } from "./llm";
import { readFile, rm, mkdtemp } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

// ─── File Registry ───────────────────────────────────────────
// Stores all files found by search_files across the agent session.
// The LLM references files by index (e.g. file_id=0) instead of copying full paths.

let fileRegistry: FileResult[] = [];
let filePathIndex: Map<string, number> = new Map();

/**
 * Reset the file registry. Call at the start of each agent run.
 */
export function resetFileRegistry(): void {
  fileRegistry = [];
  filePathIndex = new Map();
  searchHistory = [];
  searchCache = new Map();
}

/**
 * Get all files currently in the registry (for partial results on cancel).
 */
export function getRegisteredFiles(): FileResult[] {
  return [...fileRegistry];
}

/**
 * Add files to the registry with path-based deduplication.
 * Files already registered (by path) are skipped; their existing file_id is reused.
 * Returns an array of file_ids corresponding to the input files (in order).
 */
function registerFiles(files: FileResult[]): number[] {
  const ids: number[] = [];
  for (const file of files) {
    const existingId = filePathIndex.get(file.path);
    if (existingId !== undefined) {
      ids.push(existingId);
    } else {
      const newId = fileRegistry.length;
      fileRegistry.push(file);
      filePathIndex.set(file.path, newId);
      ids.push(newId);
    }
  }
  return ids;
}

/**
 * Get a file from the registry by index.
 */
function getRegisteredFile(idx: number): FileResult | undefined {
  return fileRegistry[idx];
}

// ─── Tool Definitions (OpenAI function calling schema) ───────

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_files",
      description:
        "Search for files using macOS Spotlight. Returns files with file_id. Supports pagination via offset/limit so you can iteratively fetch more candidates without flooding the context.",
      parameters: {
        type: "object",
        properties: {
          keywords: {
            type: "array",
            items: { type: "string" },
            description:
              "Keywords to search in file names and content (OR-matched).",
          },
          directory: {
            type: "string",
            description: "Directory to search in. Full path or ~ for home.",
          },
          file_types: {
            type: "array",
            items: { type: "string" },
            description: "File extensions to filter (e.g. log, txt, pdf).",
          },
          name_pattern: {
            type: "string",
            description: "Pattern to match in file name.",
          },
          date_after: {
            type: "string",
            description: "ISO date. Only files modified after this date.",
          },
          date_before: {
            type: "string",
            description: "ISO date. Only files modified before this date.",
          },
          offset: {
            type: "number",
            description:
              "Pagination offset into the candidate list. Default 0. Use next_offset returned by the tool to fetch the next page.",
          },
          limit: {
            type: "number",
            description:
              "Max number of files to return in this page. Default is extension preference maxResults.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_directories",
      description: "Find directories matching a project or system name.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Project/system name to find.",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file_preview",
      description:
        "Read content of a file. Works with text files AND binary document formats (xmind, docx, xlsx, pptx, pages, numbers, keynote). " +
        "Binary docs are automatically extracted to text. Supports offset and search_term to find specific content.",
      parameters: {
        type: "object",
        properties: {
          file_id: {
            type: "number",
            description: "file_id from search_files results.",
          },
          path: {
            type: "string",
            description: "Full file path (use file_id instead when possible).",
          },
          lines: {
            type: "number",
            description: "Lines to read. Default 50, max 200.",
          },
          offset: {
            type: "number",
            description:
              "Start reading from this line number (0-based). Default 0.",
          },
          search_term: {
            type: "string",
            description:
              "Search for this term in the file. Returns lines around the first match. More useful than reading from the start.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "grep_files",
      description:
        "Search for a text pattern inside one or more files. Returns matching lines with line numbers. " +
        "Works with text files AND binary document formats (xmind, docx, xlsx, pptx, pages, numbers). " +
        "Supports extended regex (-E): alternation (a|b), quantifiers ({n,m}), etc. " +
        "Use this to verify if files actually contain the content the user is looking for.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description:
              "Text pattern to search for (case-insensitive). Supports extended regex (ERE): " +
              "alternation (SELECT|INSERT), quantifiers ({20,}), groups (ab)+, etc.",
          },
          file_ids: {
            type: "array",
            items: { type: "number" },
            description: "file_ids from search_files to search within. Max 20.",
          },
          path: {
            type: "string",
            description:
              "Search in a specific directory path instead of file_ids.",
          },
          include_all: {
            type: "boolean",
            description:
              "If true, search ALL file types (not just code/text). Default false.",
          },
          max_depth: {
            type: "number",
            description:
              "Max directory recursion depth when searching by path. Default: unlimited.",
          },
          max_matches_per_file: {
            type: "number",
            description: "Max matching lines per file. Default 5.",
          },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_file_metadata",
      description:
        "Get detailed Spotlight metadata for a file: title, authors, description, page count, etc. " +
        "Especially useful for PDFs, Office documents, and media files where you can't read content directly.",
      parameters: {
        type: "object",
        properties: {
          file_id: {
            type: "number",
            description: "file_id from search_files.",
          },
          path: {
            type: "string",
            description: "Full file path (use file_id when possible).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_image",
      description:
        "Use AI vision to analyze an image file's visual content. " +
        "Returns a description of what the image shows. " +
        "Use this when the user describes an image by its CONTENT (e.g. 'screenshot with error', 'architecture diagram', 'photo of the whiteboard'). " +
        "Costs extra tokens — only use for top 1-3 candidates, not every image.",
      parameters: {
        type: "object",
        properties: {
          file_id: {
            type: "number",
            description: "file_id of the image from search_files.",
          },
          question: {
            type: "string",
            description:
              "What to look for in the image. Be specific. E.g. 'Does this image show an architecture diagram?' or 'Describe what this screenshot shows.'",
          },
        },
        required: ["file_id", "question"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_files",
      description:
        "List recently modified files, optionally filtered by file types or directory. " +
        "Useful when the user says 'recent', 'just now', or describes a file by when they last used it.",
      parameters: {
        type: "object",
        properties: {
          file_types: {
            type: "array",
            items: { type: "string" },
            description: "File extensions to filter (e.g. pdf, xlsx).",
          },
          directory: {
            type: "string",
            description: "Directory to search in.",
          },
          hours: {
            type: "number",
            description:
              "Look back this many hours. Default 24, max 720 (30 days).",
          },
          limit: {
            type: "number",
            description: "Max files to return. Default 20.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scan_directory",
      description:
        "Scan files in a directory by reading their content (first N bytes) and matching a regex pattern. " +
        "Does NOT rely on Spotlight index. Use when the user describes content characteristics " +
        "(e.g. 'base64 data', 'file with SQL', 'contains IP addresses') and search_files found nothing useful. " +
        "Default scans ~/Documents, ~/Downloads, ~/Desktop.",
      parameters: {
        type: "object",
        properties: {
          content_pattern: {
            type: "string",
            description:
              "JavaScript regex pattern to match against file content. " +
              'Examples: "[A-Za-z0-9+/=]{100,}" for base64, "SELECT|INSERT|UPDATE" for SQL.',
          },
          directory: {
            type: "string",
            description:
              "Directory to scan. Default: scans ~/Documents, ~/Downloads, ~/Desktop.",
          },
          file_types: {
            type: "array",
            items: { type: "string" },
            description:
              'File extensions to filter (e.g. ["json", "txt"]). Default: all files.',
          },
          max_depth: {
            type: "number",
            description: "Max directory recursion depth. Default 3, max 5.",
          },
          max_files: {
            type: "number",
            description: "Max number of files to scan. Default 500, max 1000.",
          },
          preview_bytes: {
            type: "number",
            description:
              "Bytes to read from each file for matching. Default 512, max 4096.",
          },
        },
        required: ["content_pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finish",
      description:
        "Present final results. file_ids references search_files results. " +
        "Each entry: file_id (number), relevance_score (0-100), match_reason (string, max 20 words, same language as user, facts only).",
      parameters: {
        type: "object",
        properties: {
          file_ids: {
            type: "array",
            description:
              "Ranked files. Max 10. Each item: {file_id, relevance_score, match_reason}.",
            items: {
              type: "object",
              properties: {
                file_id: { type: "number" },
                relevance_score: { type: "number" },
                match_reason: { type: "string" },
              },
            },
          },
          summary: {
            type: "string",
            description: "Brief search summary (same language as user).",
          },
          clarifying_questions: {
            type: "array",
            items: { type: "string" },
            description: "Optional 1-3 follow-up questions.",
          },
        },
        required: ["file_ids", "summary"],
      },
    },
  },
];

// ─── Tool Execution ──────────────────────────────────────────

/**
 * File type UTI mapping for mdfind queries.
 */
const FILE_TYPE_UTI_MAP: Record<string, string> = {
  xlsx: "org.openxmlformats.spreadsheetml.sheet",
  xls: "com.microsoft.excel.xls",
  csv: "public.comma-separated-values-text",
  pdf: "com.adobe.pdf",
  docx: "org.openxmlformats.wordprocessingml.document",
  doc: "com.microsoft.word.doc",
  pptx: "org.openxmlformats.presentationml.presentation",
  ppt: "com.microsoft.powerpoint.ppt",
  txt: "public.plain-text",
  md: "net.daringfireball.markdown",
  png: "public.png",
  jpg: "public.jpeg",
  jpeg: "public.jpeg",
  gif: "public.gif",
  json: "public.json",
  html: "public.html",
  py: "public.python-script",
  js: "com.netscape.javascript-source",
  ts: "com.apple.typescript",
  go: "public.go-source",
  java: "com.sun.java-source",
  sql: "public.sql",
  zip: "public.zip-archive",
  log: "public.log",
  pages: "com.apple.iwork.pages.sffpages",
  numbers: "com.apple.iwork.numbers.sffnumbers",
  keynote: "com.apple.iwork.keynote.sffkey",
};

interface SearchFilesArgs {
  keywords?: string[];
  directory?: string;
  file_types?: string[];
  name_pattern?: string;
  date_after?: string;
  date_before?: string;
  offset?: number;
  limit?: number;
}

interface FindDirectoriesArgs {
  name: string;
}

interface ReadFilePreviewArgs {
  file_id?: number;
  path?: string;
  lines?: number;
  offset?: number;
  search_term?: string;
}

interface AnalyzeImageArgs {
  file_id: number;
  question: string;
}

interface GrepFilesArgs {
  pattern: string;
  file_ids?: number[];
  path?: string;
  include_all?: boolean;
  max_depth?: number;
  max_matches_per_file?: number;
}

interface GetFileMetadataArgs {
  file_id?: number;
  path?: string;
}

interface ListRecentFilesArgs {
  file_types?: string[];
  directory?: string;
  hours?: number;
  limit?: number;
}

interface ScanDirectoryArgs {
  content_pattern: string;
  directory?: string;
  file_types?: string[];
  max_depth?: number;
  max_files?: number;
  preview_bytes?: number;
}

interface FinishFileIdEntry {
  file_id: number;
  relevance_score: number;
  match_reason: string;
}

interface FinishArgs {
  file_ids: FinishFileIdEntry[];
  summary: string;
  clarifying_questions?: string[];
}

/**
 * Get user-configured search directories.
 */
function getSearchDirs(): string[] {
  const { searchDirs } = getPreferenceValues<Preferences.RecallFile>();
  if (!searchDirs) return [];
  return searchDirs
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => d.replace(/^~/, process.env.HOME || "~"));
}

/**
 * Build individual query condition strings from args.
 */
function buildQueryParts(args: SearchFilesArgs) {
  let keywordCond = "";
  if (args.keywords && args.keywords.length > 0) {
    const kwConds = args.keywords.map(
      (kw) =>
        `(kMDItemDisplayName == "*${kw}*"wcd || kMDItemTextContent == "*${kw}*"wcd)`,
    );
    keywordCond = `(${kwConds.join(" || ")})`;
  }

  let nameCond = "";
  if (args.name_pattern) {
    nameCond = `kMDItemFSName == "*${args.name_pattern}*"cd`;
  }

  let typeCond = "";
  if (args.file_types && args.file_types.length > 0) {
    const typeConds = args.file_types.map((ft) => {
      const uti = FILE_TYPE_UTI_MAP[ft.toLowerCase()];
      return uti
        ? `kMDItemContentType == "${uti}"`
        : `kMDItemDisplayName == "*.${ft}"wcd`;
    });
    typeCond = `(${typeConds.join(" || ")})`;
  }

  let dateCond = "";
  const dateParts: string[] = [];
  if (args.date_after) {
    dateParts.push(
      `kMDItemFSContentChangeDate >= $time.iso(${args.date_after}T00:00:00Z)`,
    );
  }
  if (args.date_before) {
    dateParts.push(
      `kMDItemFSContentChangeDate < $time.iso(${args.date_before}T00:00:00Z)`,
    );
  }
  if (dateParts.length > 0) {
    dateCond = dateParts.join(" && ");
  }

  return { keywordCond, nameCond, typeCond, dateCond };
}

// ─── Search Dedup ─────────────────────────────────────────────
// Track previous search_files arguments to detect redundant searches.

let searchHistory: SearchFilesArgs[] = [];

// ─── Search Cache (pagination) ─────────────────────────────────
// Cache Spotlight path lists for a given query signature so the agent can
// request additional pages via offset/limit without rerunning mdfind.

type CachedRankedPath = { path: string; local_score: number };
let searchCache: Map<
  string,
  { ranked: CachedRankedPath[]; createdAtMs: number }
> = new Map();

function normalizeSearchArgsForCache(args: SearchFilesArgs): string {
  const home = process.env.HOME || "~";

  const keywords = (args.keywords || [])
    .map((k) => (k || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);

  const file_types = (args.file_types || [])
    .map((t) => (t || "").trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20)
    .sort();

  const directory = args.directory
    ? args.directory.replace(/^~/, home)
    : undefined;

  const name_pattern = args.name_pattern
    ? String(args.name_pattern).trim()
    : undefined;

  const date_after = args.date_after
    ? String(args.date_after).trim()
    : undefined;
  const date_before = args.date_before
    ? String(args.date_before).trim()
    : undefined;

  // offset/limit are intentionally excluded from the cache key
  return JSON.stringify({
    keywords,
    directory,
    file_types,
    name_pattern,
    date_after,
    date_before,
  });
}

function localScorePath(path: string, args: SearchFilesArgs): number {
  const lowerPath = path.toLowerCase();
  const name = (path.split("/").pop() || path).toLowerCase();
  const ext = (name.split(".").pop() || "").toLowerCase();

  const keywords = (args.keywords || [])
    .map((k) => (k || "").trim().toLowerCase())
    .filter(Boolean);

  const fileTypes = (args.file_types || [])
    .map((t) => (t || "").trim().toLowerCase())
    .filter(Boolean);

  const namePattern = args.name_pattern
    ? String(args.name_pattern).trim().toLowerCase()
    : "";

  let score = 0;

  if (namePattern && name.includes(namePattern)) score += 45;
  if (fileTypes.length > 0 && fileTypes.includes(ext)) score += 20;

  for (const kw of keywords.slice(0, 10)) {
    if (!kw) continue;
    if (name.includes(kw)) score += 18;
    else if (lowerPath.includes(kw)) score += 8;
  }

  if (args.directory) {
    const dir = args.directory
      .replace(/^~/, process.env.HOME || "~")
      .toLowerCase();
    if (dir && lowerPath.startsWith(dir)) score += 12;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Check if a new search is redundant (already covered by a prior search).
 * A search is redundant if its parameters are a subset of a previous search:
 *  - same or fewer keywords
 *  - same or no directory constraint
 *  - same or fewer file type filters
 */
function isRedundantSearch(newArgs: SearchFilesArgs): string | null {
  // Pagination requests are not redundant by definition.
  if ((newArgs.offset ?? 0) > 0) return null;

  const newKw = new Set((newArgs.keywords || []).map((k) => k.toLowerCase()));
  const newTypes = new Set(
    (newArgs.file_types || []).map((t) => t.toLowerCase()),
  );
  const newDir = newArgs.directory?.replace(/^~/, process.env.HOME || "~");

  for (const prev of searchHistory) {
    const prevKw = new Set((prev.keywords || []).map((k) => k.toLowerCase()));
    const prevTypes = new Set(
      (prev.file_types || []).map((t) => t.toLowerCase()),
    );
    const prevDir = prev.directory?.replace(/^~/, process.env.HOME || "~");

    // A search is redundant only if it's EQUAL to or NARROWER than a previous one.
    // "No constraint" means broader (matches more), NOT narrower.
    //
    // Keywords (OR semantics): more keywords = broader. So the new search is
    // covered only if its keywords are a non-empty subset of the previous search.
    const kwCovered =
      newKw.size > 0 &&
      prevKw.size > 0 &&
      [...newKw].every((k) => prevKw.has(k));
    // If new search has no keywords but prev had some, new is BROADER → not redundant
    // If new search has keywords but prev had none, prev was BROADER → new is narrower → covered
    const kwRedundant = kwCovered || (newKw.size > 0 && prevKw.size === 0);

    // Types: same logic. No type filter = all types = broader.
    const typeCovered =
      newTypes.size > 0 &&
      prevTypes.size > 0 &&
      [...newTypes].every((t) => prevTypes.has(t));
    const typeRedundant =
      typeCovered || (newTypes.size > 0 && prevTypes.size === 0);

    // Directory: new search is covered if same dir, or prev had no dir (global)
    const dirRedundant =
      newDir === prevDir || (!newDir && !prevDir) || (!!newDir && !prevDir);

    // All three must be redundant for the search to be considered covered
    if (kwRedundant && dirRedundant && typeRedundant) {
      return (
        "This search overlaps with a previous search. " +
        "The files you need are already in the results above — use those file_ids. " +
        "If they aren't sufficient, try a completely different approach: " +
        "different keywords, find_directories, grep_files, or list_recent_files."
      );
    }
  }
  return null;
}

/**
 * Execute the search_files tool.
 *
 * Uses progressive widening: tries the most specific query first,
 * then relaxes conditions step by step until results are found.
 */
export async function executeSearchFiles(
  args: SearchFilesArgs,
): Promise<string> {
  const requestedOffset = Math.max(0, Math.floor(args.offset ?? 0));
  const prefMax =
    parseInt(getPreferenceValues<Preferences.RecallFile>().maxResults) || 20;
  const requestedLimit = args.limit != null ? Math.floor(args.limit) : prefMax;
  const limit = Math.min(Math.max(1, requestedLimit), 50);

  // Canonical args: exclude pagination from cache key + redundancy checks.
  const canonicalArgs: SearchFilesArgs = {
    ...args,
    offset: 0,
    limit: undefined,
  };

  // Redundant-search guard only applies to the first page. Pagination pages are valid.
  if (requestedOffset === 0) {
    const redundant = isRedundantSearch(canonicalArgs);
    if (redundant) {
      return JSON.stringify({
        count: 0,
        files: [],
        offset: requestedOffset,
        limit,
        total_candidates: 0,
        next_offset: null,
        message: redundant,
        already_searched: true,
      });
    }
    searchHistory.push(canonicalArgs);
  }

  const cacheKey = normalizeSearchArgsForCache(canonicalArgs);
  const cached = searchCache.get(cacheKey);
  const cacheHit = !!cached;
  const configDirs = getSearchDirs();
  const { keywordCond, nameCond, typeCond, dateCond } =
    buildQueryParts(canonicalArgs);

  // Determine search directories
  let searchIn: string[] = [];
  if (canonicalArgs.directory) {
    const dir = canonicalArgs.directory.replace(/^~/, process.env.HOME || "~");
    searchIn = [dir];
  } else {
    searchIn = configDirs;
  }

  // Build progressive queries from most specific to broadest.
  const queries: string[] = [];

  // Content match = keywords OR name_pattern (not AND)
  const contentParts = [keywordCond, nameCond].filter(Boolean);
  const contentCond =
    contentParts.length > 1
      ? `(${contentParts.join(" || ")})`
      : contentParts[0] || "";

  // Strategy 1: content + type + date (full)
  if (contentCond && typeCond && dateCond) {
    queries.push([contentCond, typeCond, dateCond].join(" && "));
  }

  // Strategy 2: content + type (no date)
  if (contentCond && typeCond) {
    queries.push([contentCond, typeCond].join(" && "));
  }

  // Strategy 3: content only (no type, no date)
  if (contentCond) {
    queries.push(contentCond);
  }

  // Strategy 4: type + date (no content keywords)
  if (typeCond && dateCond && !contentCond) {
    queries.push([typeCond, dateCond].join(" && "));
  }

  // Strategy 5: type only
  if (typeCond && !contentCond) {
    queries.push(typeCond);
  }

  // Fallback
  if (queries.length === 0) {
    queries.push('kMDItemFSName == "*"');
  }

  const MAX_CANDIDATE_CAP = 5000;
  const minCandidates = Math.max(500, limit * 80);
  const maxCandidates = Math.min(MAX_CANDIDATE_CAP, minCandidates);

  let ranked: CachedRankedPath[] | null = cached?.ranked ?? null;

  if (!ranked) {
    // Execute queries progressively and cache a ranked path list.
    const allPaths = new Set<string>();
    let typeFilteredFound = false;

    for (let qi = 0; qi < queries.length; qi++) {
      const query = queries[qi];
      try {
        console.log(`mdfind query: ${query}`);
        const paths = await runMdfind(query, searchIn);
        for (const p of paths) {
          allPaths.add(p);
          if (allPaths.size >= maxCandidates) break;
        }

        if (
          qi <= 1 &&
          paths.length > 0 &&
          typeCond &&
          query.includes(typeCond)
        ) {
          typeFilteredFound = true;
        }

        if (allPaths.size >= maxCandidates) break;
      } catch {
        continue;
      }
    }

    // If we have a directory scope, also try globally when directory scope is too narrow.
    if (searchIn.length > 0 && contentCond) {
      const shouldRetryGlobal =
        allPaths.size === 0 || (typeCond && !typeFilteredFound);
      if (shouldRetryGlobal) {
        console.log("Retrying without directory scope...");
        if (typeCond) {
          try {
            const typeQuery = contentCond
              ? [contentCond, typeCond].join(" && ")
              : typeCond;
            const paths = await runMdfind(typeQuery, []);
            for (const p of paths) {
              allPaths.add(p);
              if (allPaths.size >= maxCandidates) break;
            }
          } catch {
            // ignore
          }
        }
        if (allPaths.size < maxCandidates) {
          try {
            const paths = await runMdfind(contentCond, []);
            for (const p of paths) {
              allPaths.add(p);
              if (allPaths.size >= maxCandidates) break;
            }
          } catch {
            // ignore
          }
        }
      }
    }

    const uniquePaths = [...allPaths];
    ranked = uniquePaths
      .map((p) => ({ path: p, local_score: localScorePath(p, canonicalArgs) }))
      .sort((a, b) => {
        const d = b.local_score - a.local_score;
        if (d !== 0) return d;
        const depthA = a.path.split("/").length;
        const depthB = b.path.split("/").length;
        if (depthA !== depthB) return depthA - depthB;
        return a.path.localeCompare(b.path);
      });

    searchCache.set(cacheKey, { ranked, createdAtMs: Date.now() });
  }

  const candidatePaths = ranked.map((r) => r.path);
  const scoreByPath = new Map<string, number>(
    ranked.map((r) => [r.path, r.local_score]),
  );

  const { results, nextOffset, totalCandidates } = await pathsToResultsPage(
    candidatePaths,
    requestedOffset,
    limit,
  );

  const fileIds = registerFiles(results);
  const fileInfos = results.map((f, i) => ({
    file_id: fileIds[i],
    name: f.name,
    path: f.path,
    ext: f.extension,
    size: f.sizeFormatted,
    modified: f.modifiedAt.toISOString().split("T")[0],
    created: f.createdAt.toISOString().split("T")[0],
    local_score:
      scoreByPath.get(f.path) ?? localScorePath(f.path, canonicalArgs),
  }));

  if (fileInfos.length === 0) {
    return JSON.stringify({
      count: 0,
      files: [],
      offset: requestedOffset,
      limit,
      total_candidates: totalCandidates,
      next_offset: nextOffset < totalCandidates ? nextOffset : null,
      cache_hit: cacheHit,
      message:
        requestedOffset > 0
          ? "No files found in this page. Try fetching the next page (next_offset) or adjust the query."
          : "No files found matching the criteria.",
    });
  }

  return JSON.stringify({
    count: fileInfos.length,
    files: fileInfos,
    offset: requestedOffset,
    limit,
    total_candidates: totalCandidates,
    next_offset: nextOffset < totalCandidates ? nextOffset : null,
    cache_hit: cacheHit,
  });
}

/**
 * Execute the find_directories tool.
 */
export async function executeFindDirectories(
  args: FindDirectoriesArgs,
): Promise<string> {
  const configDirs = getSearchDirs();

  try {
    const dirs = await findDirectories(args.name, configDirs);

    if (dirs.length === 0) {
      return JSON.stringify({
        count: 0,
        directories: [],
        message: `No directories found matching "${args.name}".`,
      });
    }

    return JSON.stringify({
      count: dirs.length,
      directories: dirs.slice(0, 10),
    });
  } catch (error) {
    return JSON.stringify({
      count: 0,
      directories: [],
      error: error instanceof Error ? error.message : "Search failed",
    });
  }
}

/**
 * Execute the read_file_preview tool.
 * Enhanced: supports offset and search_term for targeted content reading.
 */
/**
 * Binary/archive file extensions that need special extraction to read content.
 * These are ZIP-based formats with structured content inside.
 */
const BINARY_DOC_EXTENSIONS = new Set([
  "xmind",
  "docx",
  "xlsx",
  "pptx",
  "odt",
  "ods",
  "odp",
  "pages",
  "numbers",
  "keynote",
]);

/**
 * Extract readable text from binary document formats.
 * Uses macOS-native tools: textutil for Office/iWork, unzip for XMind.
 */
async function extractBinaryDocContent(
  filePath: string,
  ext: string,
): Promise<string | null> {
  try {
    const lowerExt = ext.toLowerCase();

    // XMind: ZIP containing content.json
    if (lowerExt === "xmind") {
      try {
        const { stdout } = await execFileAsync("unzip", [
          "-p",
          filePath,
          "content.json",
        ]);
        // Parse JSON and extract readable text
        const data = JSON.parse(stdout);
        return extractXMindText(data);
      } catch {
        // Older XMind format: try content.xml
        try {
          const { stdout } = await execFileAsync("unzip", [
            "-p",
            filePath,
            "content.xml",
          ]);
          // Strip XML tags for readable text
          return stdout
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        } catch {
          return null;
        }
      }
    }

    // Office/iWork docs: use macOS textutil to convert to plain text
    if (["docx", "doc", "pages", "odt", "rtf"].includes(lowerExt)) {
      const { stdout } = await execFileAsync("textutil", [
        "-convert",
        "txt",
        "-stdout",
        filePath,
      ]);
      return stdout;
    }

    // XLSX/Numbers/ODS: use mdimport for basic text extraction
    if (["xlsx", "xls", "numbers", "csv", "ods"].includes(lowerExt)) {
      try {
        const { stdout } = await execFileAsync("mdimport", ["-d2", filePath]);
        // Extract text content from mdimport debug output
        const textMatch = stdout.match(/kMDItemTextContent\s*=\s*"([^"]+)"/);
        if (textMatch) return textMatch[1];
      } catch {
        // Fallback: try Spotlight metadata
      }
      return null;
    }

    // PPTX/Keynote/ODP: use textutil if available
    if (["pptx", "keynote", "odp"].includes(lowerExt)) {
      try {
        const { stdout } = await execFileAsync("textutil", [
          "-convert",
          "txt",
          "-stdout",
          filePath,
        ]);
        return stdout;
      } catch {
        return null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Recursively extract text from XMind JSON content structure.
 */
function extractXMindText(data: unknown): string {
  const texts: string[] = [];

  function walk(obj: unknown) {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      for (const item of obj) walk(item);
      return;
    }
    const record = obj as Record<string, unknown>;
    // Extract title/text fields common in XMind JSON
    for (const key of ["title", "text", "content", "label", "note"]) {
      if (typeof record[key] === "string" && (record[key] as string).trim()) {
        texts.push(record[key] as string);
      }
    }
    // Recurse into nested objects
    for (const value of Object.values(record)) {
      walk(value);
    }
  }

  walk(data);
  return texts.join("\n");
}

export async function executeReadFilePreview(
  args: ReadFilePreviewArgs,
): Promise<string> {
  const maxLines = Math.min(args.lines ?? 50, 200);

  // Resolve path from file_id or direct path
  let filePath = args.path;
  if (args.file_id !== undefined) {
    const file = getRegisteredFile(args.file_id);
    if (file) {
      filePath = file.path;
    } else {
      return JSON.stringify({ error: `Invalid file_id: ${args.file_id}` });
    }
  }

  if (!filePath) {
    return JSON.stringify({ error: "Either file_id or path is required." });
  }

  // Check if this is a binary document format that needs special extraction
  const fileExt = filePath.split(".").pop() || "";
  if (BINARY_DOC_EXTENSIONS.has(fileExt.toLowerCase())) {
    try {
      const extracted = await extractBinaryDocContent(filePath, fileExt);
      if (!extracted) {
        return JSON.stringify({
          path: filePath,
          binary: true,
          error: `Could not extract text from .${fileExt} file. Try get_file_metadata for basic info.`,
        });
      }
      const allLines = extracted.split("\n");
      const totalLines = allLines.length;

      // Support search_term in extracted content
      if (args.search_term) {
        const termLower = args.search_term.toLowerCase();
        const matchIndices: number[] = [];
        for (let i = 0; i < allLines.length; i++) {
          if (allLines[i].toLowerCase().includes(termLower)) {
            matchIndices.push(i);
          }
        }
        if (matchIndices.length === 0) {
          return JSON.stringify({
            path: filePath,
            binary: true,
            extracted: true,
            search_term: args.search_term,
            found: false,
            total_lines: totalLines,
            message: `"${args.search_term}" not found in extracted content of .${fileExt} file.`,
          });
        }
        const contextLines = 3;
        const snippets: { line_number: number; content: string }[] = [];
        for (const matchIdx of matchIndices.slice(0, 5)) {
          const start = Math.max(0, matchIdx - contextLines);
          const end = Math.min(totalLines, matchIdx + contextLines + 1);
          for (let i = start; i < end; i++) {
            snippets.push({ line_number: i + 1, content: allLines[i] });
          }
        }
        const previewText = snippets
          .map((s) => `${s.line_number}: ${s.content}`)
          .join("\n");
        return JSON.stringify({
          path: filePath,
          binary: true,
          extracted: true,
          search_term: args.search_term,
          found: true,
          match_count: matchIndices.length,
          total_lines: totalLines,
          preview:
            previewText.length > 4000
              ? previewText.slice(0, 4000) + "\n... (truncated)"
              : previewText,
        });
      }

      // Default: show first N lines of extracted content
      const offset = args.offset ?? 0;
      const lines = allLines.slice(offset, offset + maxLines);
      const preview = lines.join("\n");
      return JSON.stringify({
        path: filePath,
        binary: true,
        extracted: true,
        offset,
        lines_shown: lines.length,
        total_lines: totalLines,
        preview:
          preview.length > 4000
            ? preview.slice(0, 4000) + "\n... (truncated)"
            : preview,
      });
    } catch (error) {
      return JSON.stringify({
        path: filePath,
        binary: true,
        error:
          error instanceof Error ? error.message : "Failed to extract content",
      });
    }
  }

  try {
    const content = await readFile(filePath, "utf-8");
    const allLines = content.split("\n");
    const totalLines = allLines.length;

    // If search_term provided, find it and show context around it
    if (args.search_term) {
      const termLower = args.search_term.toLowerCase();
      const matchIndices: number[] = [];

      for (let i = 0; i < allLines.length; i++) {
        if (allLines[i].toLowerCase().includes(termLower)) {
          matchIndices.push(i);
        }
      }

      if (matchIndices.length === 0) {
        return JSON.stringify({
          path: filePath,
          search_term: args.search_term,
          found: false,
          total_lines: totalLines,
          message: `"${args.search_term}" not found in file.`,
        });
      }

      // Show context around first few matches
      const contextLines = 5;
      const snippets: { line_number: number; content: string }[] = [];
      const shownRanges = new Set<number>();

      for (const matchIdx of matchIndices.slice(0, 5)) {
        const start = Math.max(0, matchIdx - contextLines);
        const end = Math.min(totalLines, matchIdx + contextLines + 1);

        for (let i = start; i < end; i++) {
          if (!shownRanges.has(i)) {
            shownRanges.add(i);
            snippets.push({ line_number: i + 1, content: allLines[i] });
          }
        }
      }

      snippets.sort((a, b) => a.line_number - b.line_number);

      const previewText = snippets
        .map((s) => `${s.line_number}: ${s.content}`)
        .join("\n");

      return JSON.stringify({
        path: filePath,
        search_term: args.search_term,
        found: true,
        match_count: matchIndices.length,
        total_lines: totalLines,
        preview:
          previewText.length > 4000
            ? previewText.slice(0, 4000) + "\n... (truncated)"
            : previewText,
      });
    }

    // Offset-based reading
    const offset = args.offset ?? 0;
    const lines = allLines.slice(offset, offset + maxLines);
    const preview = lines.join("\n");

    return JSON.stringify({
      path: filePath,
      offset,
      lines_shown: lines.length,
      total_lines: totalLines,
      preview:
        preview.length > 4000
          ? preview.slice(0, 4000) + "\n... (truncated)"
          : preview,
    });
  } catch (error) {
    return JSON.stringify({
      path: filePath,
      error: error instanceof Error ? error.message : "Failed to read file",
    });
  }
}

/**
 * Execute the grep_files tool.
 * Searches for a text pattern inside files using grep.
 */
export async function executeGrepFiles(args: GrepFilesArgs): Promise<string> {
  const maxMatchesPerFile = Math.min(args.max_matches_per_file ?? 5, 20);
  const results: {
    file_id?: number;
    path: string;
    name: string;
    matches: { line_number: number; content: string }[];
  }[] = [];

  const MAX_FILES_TO_SCAN_IN_DIR = 800;
  const MAX_DEPTH_CAP = 20;

  // Default extensions when include_all is false (plus binary docs we can extract).
  const DEFAULT_TEXT_EXTS = new Set([
    "txt",
    "log",
    "md",
    "json",
    "csv",
    "js",
    "ts",
    "jsx",
    "tsx",
    "py",
    "go",
    "java",
    "sql",
    "html",
    "css",
    "xml",
    "yaml",
    "yml",
    "toml",
    "cfg",
    "conf",
    "ini",
    "sh",
    "bash",
    "zsh",
    "env",
    "properties",
  ]);

  // Directory exclusions to keep recursive search focused and fast.
  // (Mirrors scan_directory exclusions, with a couple common extras.)
  const GREP_EXCLUDE_DIRS = new Set([
    "node_modules",
    ".git",
    ".svn",
    "__pycache__",
    ".cache",
    ".Trash",
    "Library",
    ".npm",
    ".cargo",
    ".rustup",
    "vendor",
    "dist",
    "build",
    ".next",
    "pkg",
    ".venv",
    "venv",
  ]);

  function compilePatternRegex(pattern: string): RegExp | null {
    try {
      return new RegExp(pattern, "i");
    } catch {
      return null;
    }
  }

  async function collectCandidateFilesInDir(
    dir: string,
    maxDepthRaw: number | undefined,
    includeAll: boolean | undefined,
  ): Promise<string[]> {
    const maxDepth =
      maxDepthRaw != null
        ? Math.max(1, Math.min(maxDepthRaw, MAX_DEPTH_CAP))
        : MAX_DEPTH_CAP;

    const excludeArgs: string[] = [];
    for (const d of GREP_EXCLUDE_DIRS) {
      excludeArgs.push("-not", "-path", `*/${d}/*`);
    }

    const allowedExts =
      includeAll === true
        ? null
        : new Set<string>([
            ...DEFAULT_TEXT_EXTS,
            ...Array.from(BINARY_DOC_EXTENSIONS),
          ]);

    const extFilterArgs: string[] = [];
    if (allowedExts) {
      const exts = Array.from(allowedExts).sort();
      extFilterArgs.push("(");
      for (let i = 0; i < exts.length; i++) {
        if (i > 0) extFilterArgs.push("-o");
        extFilterArgs.push("-iname", `*.${exts[i]}`);
      }
      extFilterArgs.push(")");
    }

    const unique = new Set<string>();

    // Breadth-first by depth: shallow files first.
    for (let depth = 1; depth <= maxDepth; depth++) {
      if (unique.size >= MAX_FILES_TO_SCAN_IN_DIR) break;
      try {
        const findArgs = [
          dir,
          "-mindepth",
          String(depth),
          "-maxdepth",
          String(depth),
          "-type",
          "f",
          ...excludeArgs,
          ...extFilterArgs,
        ];

        const { stdout } = await execFileAsync("find", findArgs, {
          timeout: 10000,
          maxBuffer: 4 * 1024 * 1024,
        });
        const paths = stdout.trim().split("\n").filter(Boolean);
        for (const p of paths) {
          unique.add(p);
          if (unique.size >= MAX_FILES_TO_SCAN_IN_DIR) break;
        }
      } catch {
        continue;
      }
    }

    return Array.from(unique);
  }

  // Collect file paths to search
  const filesToSearch: { fileId?: number; path: string; name: string }[] = [];

  if (args.file_ids && args.file_ids.length > 0) {
    for (const fid of args.file_ids.slice(0, 20)) {
      const file = getRegisteredFile(fid);
      if (file) {
        filesToSearch.push({ fileId: fid, path: file.path, name: file.name });
      }
    }
  }

  if (args.path) {
    // Directory scope: enumerate candidate files via find (portable on macOS),
    // then grep per-file. This avoids GNU-only grep flags (--include/--max-depth).
    const dir = args.path.replace(/^~/, process.env.HOME || "~");
    const candidatePaths = await collectCandidateFilesInDir(
      dir,
      args.max_depth,
      args.include_all,
    );

    for (const p of candidatePaths) {
      const name = p.split("/").pop() || p;
      filesToSearch.push({ path: p, name });
    }
  }

  if (filesToSearch.length === 0) {
    return JSON.stringify({
      pattern: args.pattern,
      total_files_searched: 0,
      total_matches: 0,
      results: [],
      message: "No files to search. Provide file_ids or path.",
    });
  }

  // Search each file
  let totalMatches = 0;
  const patternRegex = compilePatternRegex(args.pattern);
  for (const fileInfo of filesToSearch) {
    // Stop early if we have enough matched files
    if (results.length >= 20) break;

    // Check if this is a binary document that needs extraction
    const ext = (fileInfo.path.split(".").pop() || "").toLowerCase();
    if (BINARY_DOC_EXTENSIONS.has(ext)) {
      try {
        const extracted = await extractBinaryDocContent(fileInfo.path, ext);
        if (extracted) {
          const lines = extracted.split("\n");
          const matches: { line_number: number; content: string }[] = [];
          for (
            let i = 0;
            i < lines.length && matches.length < maxMatchesPerFile;
            i++
          ) {
            const line = lines[i] ?? "";
            const isMatch = patternRegex
              ? patternRegex.test(line)
              : line.toLowerCase().includes(args.pattern.toLowerCase());
            if (isMatch) {
              const content = lines[i].trim();
              matches.push({
                line_number: i + 1,
                content:
                  content.length > 200
                    ? content.slice(0, 200) + "..."
                    : content,
              });
            }
          }
          if (matches.length > 0) {
            totalMatches += matches.length;
            // Ensure path-scoped results are registered for follow-up tool calls.
            let registeredId = fileInfo.fileId;
            if (registeredId === undefined) {
              const meta = await pathsToResults([fileInfo.path], 1);
              if (meta.length > 0) {
                registeredId = registerFiles(meta)[0];
              }
            }
            results.push({
              file_id: registeredId,
              path: fileInfo.path,
              name: fileInfo.name,
              matches,
            });
          }
        }
      } catch {
        // Binary extraction failed, skip this file
      }
      continue;
    }

    try {
      const { stdout } = await execFileAsync(
        "grep",
        [
          "-Eain",
          "-m",
          String(maxMatchesPerFile),
          "--",
          args.pattern,
          fileInfo.path,
        ],
        { timeout: 5000, maxBuffer: 512 * 1024 },
      );

      const matchLines = stdout.trim().split("\n").filter(Boolean);
      const matches = matchLines.map((line) => {
        const colonIdx = line.indexOf(":");
        const lineNum =
          colonIdx > 0 ? parseInt(line.substring(0, colonIdx)) || 0 : 0;
        const content =
          colonIdx > 0 ? line.substring(colonIdx + 1).trim() : line.trim();
        return {
          line_number: lineNum,
          content:
            content.length > 200 ? content.slice(0, 200) + "..." : content,
        };
      });

      if (matches.length > 0) {
        totalMatches += matches.length;
        // Ensure path-scoped results are registered for follow-up tool calls.
        let registeredId = fileInfo.fileId;
        if (registeredId === undefined) {
          const meta = await pathsToResults([fileInfo.path], 1);
          if (meta.length > 0) {
            registeredId = registerFiles(meta)[0];
          }
        }
        results.push({
          file_id: registeredId,
          path: fileInfo.path,
          name: fileInfo.name,
          matches,
        });
      }
    } catch {
      // grep exit code 1 = no match, that's normal
      continue;
    }

    // Stop early if we have enough matches
    if (results.length >= 20) break;
  }

  return JSON.stringify({
    pattern: args.pattern,
    total_files_searched: filesToSearch.length,
    total_matches: totalMatches,
    files_with_matches: results.length,
    results,
  });
}

/**
 * All interesting Spotlight metadata keys, organized by category.
 */
const METADATA_KEYS = [
  // ── Document ──
  "kMDItemTitle",
  "kMDItemAuthors",
  "kMDItemDescription",
  "kMDItemSubject",
  "kMDItemKeywords",
  "kMDItemComment",
  "kMDItemHeadline",
  "kMDItemNumberOfPages",
  "kMDItemCreator",
  "kMDItemEncodingApplications",
  "kMDItemFinderComment",
  "kMDItemWhereFroms",
  // ── Type ──
  "kMDItemContentType",
  "kMDItemKind",
  "kMDItemDisplayName",
  // ── Image / Photo ──
  "kMDItemPixelHeight",
  "kMDItemPixelWidth",
  "kMDItemColorSpace",
  "kMDItemProfileName",
  "kMDItemHasAlphaChannel",
  "kMDItemOrientation",
  "kMDItemAcquisitionModel", // camera model
  "kMDItemAcquisitionMake", // camera brand
  "kMDItemExposureTimeSeconds",
  "kMDItemFNumber", // aperture
  "kMDItemFocalLength",
  "kMDItemISOSpeed",
  "kMDItemFlashOnOff",
  "kMDItemRedEyeOnOff",
  "kMDItemWhiteBalance",
  "kMDItemImageDirection",
  "kMDItemLatitude",
  "kMDItemLongitude",
  "kMDItemAltitude",
  "kMDItemIsScreenCapture", // screenshot detection!
  "kMDItemScreenCaptureType", // window/selection/fullscreen
  "kMDItemScreenCaptureGlobalRect",
  // ── Video ──
  "kMDItemDurationSeconds",
  "kMDItemMediaTypes",
  "kMDItemCodecs",
  "kMDItemVideoBitRate",
  "kMDItemTotalBitRate",
  "kMDItemStreamable",
  // ── Audio / Music ──
  "kMDItemAudioBitRate",
  "kMDItemAudioChannelCount",
  "kMDItemAudioSampleRate",
  "kMDItemMusicalGenre",
  "kMDItemAlbum",
  "kMDItemComposer",
  "kMDItemRecordingDate",
  "kMDItemTempo",
  // ── Dates / Size ──
  "kMDItemFSContentChangeDate",
  "kMDItemFSCreationDate",
  "kMDItemFSSize",
  "kMDItemContentCreationDate",
  "kMDItemContentModificationDate",
];

/**
 * Human-readable labels for metadata keys.
 */
const METADATA_LABELS: Record<string, string> = {
  kMDItemTitle: "Title",
  kMDItemAuthors: "Authors",
  kMDItemDescription: "Description",
  kMDItemSubject: "Subject",
  kMDItemKeywords: "Keywords",
  kMDItemComment: "Comment",
  kMDItemHeadline: "Headline",
  kMDItemNumberOfPages: "Pages",
  kMDItemCreator: "Creator App",
  kMDItemEncodingApplications: "Encoding App",
  kMDItemFinderComment: "Finder Comment",
  kMDItemWhereFroms: "Downloaded From",
  kMDItemContentType: "Content Type",
  kMDItemKind: "Kind",
  kMDItemDisplayName: "Display Name",
  kMDItemPixelHeight: "Height (px)",
  kMDItemPixelWidth: "Width (px)",
  kMDItemColorSpace: "Color Space",
  kMDItemHasAlphaChannel: "Has Alpha",
  kMDItemOrientation: "Orientation",
  kMDItemAcquisitionModel: "Camera Model",
  kMDItemAcquisitionMake: "Camera Make",
  kMDItemExposureTimeSeconds: "Exposure Time",
  kMDItemFNumber: "Aperture (f/)",
  kMDItemFocalLength: "Focal Length (mm)",
  kMDItemISOSpeed: "ISO",
  kMDItemFlashOnOff: "Flash",
  kMDItemLatitude: "Latitude",
  kMDItemLongitude: "Longitude",
  kMDItemAltitude: "Altitude",
  kMDItemIsScreenCapture: "Is Screenshot",
  kMDItemScreenCaptureType: "Screenshot Type",
  kMDItemDurationSeconds: "Duration (sec)",
  kMDItemMediaTypes: "Media Types",
  kMDItemCodecs: "Codecs",
  kMDItemVideoBitRate: "Video Bitrate",
  kMDItemTotalBitRate: "Total Bitrate",
  kMDItemAudioBitRate: "Audio Bitrate",
  kMDItemAudioChannelCount: "Audio Channels",
  kMDItemAudioSampleRate: "Sample Rate",
  kMDItemMusicalGenre: "Genre",
  kMDItemAlbum: "Album",
  kMDItemComposer: "Composer",
  kMDItemRecordingDate: "Recording Date",
  kMDItemTempo: "BPM",
  kMDItemFSContentChangeDate: "Modified",
  kMDItemFSCreationDate: "Created",
  kMDItemFSSize: "File Size (bytes)",
  kMDItemContentCreationDate: "Content Created",
  kMDItemContentModificationDate: "Content Modified",
};

/**
 * Execute the get_file_metadata tool.
 * Uses macOS `mdls` to get Spotlight metadata.
 * Returns both raw metadata and a human-readable summary.
 */
export async function executeGetFileMetadata(
  args: GetFileMetadataArgs,
): Promise<string> {
  // Resolve path
  let filePath = args.path;
  if (args.file_id !== undefined) {
    const file = getRegisteredFile(args.file_id);
    if (file) {
      filePath = file.path;
    } else {
      return JSON.stringify({ error: `Invalid file_id: ${args.file_id}` });
    }
  }

  if (!filePath) {
    return JSON.stringify({ error: "Either file_id or path is required." });
  }

  try {
    const { stdout } = await execFileAsync("mdls", [filePath], {
      timeout: 5000,
      maxBuffer: 512 * 1024,
    });

    // Parse metadata
    const metadata: Record<string, string> = {};
    const keySet = new Set(METADATA_KEYS);

    for (const line of stdout.split("\n")) {
      const match = line.match(/^(\w+)\s*=\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        const trimmed = value.trim();
        if (keySet.has(key) && trimmed !== "(null)" && trimmed !== "(\n)") {
          metadata[key] = trimmed;
        }
      }
    }

    // Build human-readable summary
    const summary = buildMetadataSummary(metadata, filePath);

    return JSON.stringify({
      path: filePath,
      summary,
      details: Object.fromEntries(
        Object.entries(metadata).map(([k, v]) => [METADATA_LABELS[k] || k, v]),
      ),
      metadata_count: Object.keys(metadata).length,
    });
  } catch (error) {
    return JSON.stringify({
      path: filePath,
      error: error instanceof Error ? error.message : "Failed to read metadata",
    });
  }
}

/**
 * Build a concise human-readable summary from metadata.
 */
function buildMetadataSummary(
  md: Record<string, string>,
  filePath: string,
): string {
  const parts: string[] = [];
  const kind = md.kMDItemKind || "";

  // Type identification
  if (md.kMDItemIsScreenCapture === "1") {
    const captureType = md.kMDItemScreenCaptureType || "screen";
    parts.push(`Screenshot (${captureType})`);
  } else if (kind) {
    parts.push(kind);
  }

  // Title
  if (md.kMDItemTitle) parts.push(`Title: ${md.kMDItemTitle}`);

  // Authors
  if (md.kMDItemAuthors) parts.push(`By: ${md.kMDItemAuthors}`);

  // Image info
  if (md.kMDItemPixelWidth && md.kMDItemPixelHeight) {
    parts.push(`${md.kMDItemPixelWidth}×${md.kMDItemPixelHeight}`);
  }

  // Camera info
  if (md.kMDItemAcquisitionMake || md.kMDItemAcquisitionModel) {
    const camera = [md.kMDItemAcquisitionMake, md.kMDItemAcquisitionModel]
      .filter(Boolean)
      .join(" ");
    parts.push(`Camera: ${camera}`);
  }

  // Photo settings
  const photoSettings: string[] = [];
  if (md.kMDItemFNumber) photoSettings.push(`f/${md.kMDItemFNumber}`);
  if (md.kMDItemExposureTimeSeconds)
    photoSettings.push(`${md.kMDItemExposureTimeSeconds}s`);
  if (md.kMDItemISOSpeed) photoSettings.push(`ISO ${md.kMDItemISOSpeed}`);
  if (md.kMDItemFocalLength) photoSettings.push(`${md.kMDItemFocalLength}mm`);
  if (photoSettings.length > 0) parts.push(photoSettings.join(", "));

  // GPS location
  if (md.kMDItemLatitude && md.kMDItemLongitude) {
    parts.push(`GPS: ${md.kMDItemLatitude}, ${md.kMDItemLongitude}`);
  }

  // Video/Audio duration
  if (md.kMDItemDurationSeconds) {
    const secs = parseFloat(md.kMDItemDurationSeconds);
    if (secs > 3600) {
      parts.push(
        `Duration: ${Math.floor(secs / 3600)}h${Math.floor((secs % 3600) / 60)}m`,
      );
    } else if (secs > 60) {
      parts.push(
        `Duration: ${Math.floor(secs / 60)}m${Math.floor(secs % 60)}s`,
      );
    } else {
      parts.push(`Duration: ${Math.floor(secs)}s`);
    }
  }

  // Audio info
  if (md.kMDItemAlbum) parts.push(`Album: ${md.kMDItemAlbum}`);
  if (md.kMDItemMusicalGenre) parts.push(`Genre: ${md.kMDItemMusicalGenre}`);
  if (md.kMDItemComposer) parts.push(`Composer: ${md.kMDItemComposer}`);

  // Codecs
  if (md.kMDItemCodecs) parts.push(`Codecs: ${md.kMDItemCodecs}`);

  // Pages (for documents)
  if (md.kMDItemNumberOfPages) parts.push(`${md.kMDItemNumberOfPages} pages`);

  // Downloaded from
  if (md.kMDItemWhereFroms) {
    const url = md.kMDItemWhereFroms.replace(/[()"\s]/g, "").split(",")[0];
    if (url)
      parts.push(`From: ${url.length > 60 ? url.slice(0, 60) + "..." : url}`);
  }

  // Creator app
  if (md.kMDItemCreator) parts.push(`App: ${md.kMDItemCreator}`);

  // Description / Comment
  if (md.kMDItemDescription)
    parts.push(`Description: ${md.kMDItemDescription}`);
  if (md.kMDItemComment) parts.push(`Comment: ${md.kMDItemComment}`);
  if (md.kMDItemFinderComment)
    parts.push(`Finder note: ${md.kMDItemFinderComment}`);

  return parts.join(" | ") || `File: ${filePath.split("/").pop()}`;
}

/**
 * Execute the list_recent_files tool.
 * Uses mdfind with date filter to find recently modified files.
 */
/**
 * Execute the analyze_image tool.
 * Uses macOS `sips` to create a thumbnail, then sends to multimodal LLM.
 */
export async function executeAnalyzeImage(
  args: AnalyzeImageArgs,
): Promise<string> {
  const file = getRegisteredFile(args.file_id);
  if (!file) {
    return JSON.stringify({ error: `Invalid file_id: ${args.file_id}` });
  }

  // Check if it's an image
  const imageExts = new Set([
    "png",
    "jpg",
    "jpeg",
    "gif",
    "webp",
    "bmp",
    "tiff",
    "tif",
    "heic",
    "heif",
  ]);
  if (!imageExts.has(file.extension.toLowerCase())) {
    return JSON.stringify({
      error: `file_id ${args.file_id} (${file.name}) is not an image. Use get_file_metadata for non-image files.`,
    });
  }

  // Check file size — skip very large images (>20MB)
  if (file.size > 20 * 1024 * 1024) {
    return JSON.stringify({
      path: file.path,
      error:
        "Image too large for analysis (>20MB). Use get_file_metadata instead.",
    });
  }

  let tmpDir: string | null = null;

  try {
    // Create a thumbnail using sips (macOS built-in)
    // Resize to max 512px on longest side, convert to JPEG for smaller payload
    tmpDir = await mkdtemp(join(tmpdir(), "recall-"));
    const thumbPath = join(tmpDir, "thumb.jpg");

    // sips: resize proportionally, max 512px
    await execFileAsync(
      "sips",
      [
        "--resampleHeightWidthMax",
        "512",
        "--setProperty",
        "format",
        "jpeg",
        "--setProperty",
        "formatOptions",
        "60", // quality 60%
        file.path,
        "--out",
        thumbPath,
      ],
      { timeout: 10000 },
    );

    // Read thumbnail as base64
    const thumbBuffer = await readFile(thumbPath);
    const base64 = thumbBuffer.toString("base64");

    // (temp file cleaned up with tmpDir in finally block)

    // Send to multimodal LLM
    const question =
      args.question || "Describe this image in detail. What does it show?";
    const description = await analyzeImageLLM(base64, "image/jpeg", question);

    return JSON.stringify({
      file_id: args.file_id,
      name: file.name,
      path: file.path,
      question: args.question,
      description,
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to analyze image";

    // If sips fails (e.g. unsupported format), try sending original
    try {
      const originalBuffer = await readFile(file.path);
      // Only send if under 1MB
      if (originalBuffer.length < 1024 * 1024) {
        const base64 = originalBuffer.toString("base64");
        const mimeMap: Record<string, string> = {
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          gif: "image/gif",
          webp: "image/webp",
          bmp: "image/bmp",
        };
        const mime = mimeMap[file.extension.toLowerCase()] || "image/jpeg";
        const description = await analyzeImageLLM(base64, mime, args.question);

        return JSON.stringify({
          file_id: args.file_id,
          name: file.name,
          path: file.path,
          question: args.question,
          description,
        });
      }
    } catch {
      /* ignore fallback error */
    }

    return JSON.stringify({
      file_id: args.file_id,
      name: file.name,
      error: msg,
    });
  } finally {
    // Clean up temp directory
    if (tmpDir) {
      try {
        await rm(tmpDir, { recursive: true });
      } catch {
        /* ignore */
      }
    }
  }
}

export async function executeListRecentFiles(
  args: ListRecentFilesArgs,
): Promise<string> {
  const hours = Math.min(args.hours ?? 24, 720); // max 30 days
  const limit = Math.min(args.limit ?? 20, 50);
  const configDirs = getSearchDirs();

  // Build date condition
  const afterDate = new Date(Date.now() - hours * 3600 * 1000);
  const afterStr = afterDate.toISOString().replace(/\.\d{3}Z$/, "Z");
  let query = `kMDItemFSContentChangeDate >= $time.iso(${afterStr})`;

  // Add file type filter
  if (args.file_types && args.file_types.length > 0) {
    const typeConds = args.file_types.map((ft) => {
      const uti = FILE_TYPE_UTI_MAP[ft.toLowerCase()];
      return uti
        ? `kMDItemContentType == "${uti}"`
        : `kMDItemDisplayName == "*.${ft}"wcd`;
    });
    query += ` && (${typeConds.join(" || ")})`;
  }

  // Exclude system files
  query += ` && kMDItemFSName != ".*"`;

  // Determine search dirs
  let searchIn: string[] = [];
  if (args.directory) {
    searchIn = [args.directory.replace(/^~/, process.env.HOME || "~")];
  } else if (configDirs.length > 0) {
    searchIn = configDirs;
  }

  try {
    console.log(`list_recent_files query: ${query}`);
    const paths = await runMdfind(query, searchIn);
    const results = await pathsToResults(paths, limit);

    if (results.length === 0) {
      return JSON.stringify({
        count: 0,
        files: [],
        hours,
        message: `No files modified in the last ${hours} hours.`,
      });
    }

    // Register (with dedup) and return
    const fileIds = registerFiles(results);
    const fileInfos = results.map((f, i) => ({
      file_id: fileIds[i],
      name: f.name,
      path: f.path,
      ext: f.extension,
      size: f.sizeFormatted,
      modified: f.modifiedAt.toISOString().split("T")[0],
      created: f.createdAt.toISOString().split("T")[0],
    }));

    return JSON.stringify({ count: results.length, hours, files: fileInfos });
  } catch (error) {
    return JSON.stringify({
      count: 0,
      files: [],
      error: error instanceof Error ? error.message : "Search failed",
    });
  }
}

// ─── Scan Directory ──────────────────────────────────────────

/**
 * Directories to exclude from scan_directory to avoid noise.
 */
const SCAN_EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  "__pycache__",
  ".cache",
  ".Trash",
  "Library",
  ".npm",
  ".cargo",
  ".rustup",
  "vendor",
  "dist",
  "build",
  ".next",
  "pkg",
]);

/**
 * Default directories to scan when no directory is specified.
 */
const DEFAULT_SCAN_DIRS = ["~/Documents", "~/Downloads", "~/Desktop"];

/**
 * Execute the scan_directory tool.
 * Scans files in a directory by reading their first N bytes and matching a regex.
 * This bypasses Spotlight indexing entirely — useful for content-pattern searches.
 */
export async function executeScanDirectory(
  args: ScanDirectoryArgs,
): Promise<string> {
  const maxDepth = Math.min(args.max_depth ?? 3, 5);
  const maxFiles = Math.min(args.max_files ?? 500, 1000);
  const previewBytes = Math.min(args.preview_bytes ?? 512, 4096);
  const home = process.env.HOME || "~";

  // Validate the content_pattern as a valid regex
  let regex: RegExp;
  try {
    regex = new RegExp(args.content_pattern, "i");
  } catch (e) {
    return JSON.stringify({
      error: `Invalid regex pattern: ${e instanceof Error ? e.message : "unknown error"}`,
    });
  }

  // Determine directories to scan
  const scanDirs: string[] = [];
  if (args.directory) {
    scanDirs.push(args.directory.replace(/^~/, home));
  } else {
    for (const d of DEFAULT_SCAN_DIRS) {
      scanDirs.push(d.replace(/^~/, home));
    }
  }

  // Build find command arguments for file extension filter
  const extFilter: string[] = [];
  if (args.file_types && args.file_types.length > 0) {
    for (let i = 0; i < args.file_types.length; i++) {
      if (i > 0) extFilter.push("-o");
      extFilter.push("-name", `*.${args.file_types[i]}`);
    }
  }

  // Build exclude patterns for find's -not -path
  const excludeArgs: string[] = [];
  for (const dir of SCAN_EXCLUDE_DIRS) {
    excludeArgs.push("-not", "-path", `*/${dir}/*`);
  }

  // Collect candidate file paths across all scan directories
  // We scan depth-by-depth (breadth-first) so shallow files get priority.
  // This ensures files like ~/Documents/test.json are scanned before
  // deeply nested files in subdirectories.
  const candidatePaths: string[] = [];

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (candidatePaths.length >= maxFiles) break;

    for (const scanDir of scanDirs) {
      try {
        const findArgs = [
          scanDir,
          "-mindepth",
          String(depth),
          "-maxdepth",
          String(depth),
          "-type",
          "f",
          ...excludeArgs,
        ];

        // Add extension filter if specified
        if (extFilter.length > 0) {
          findArgs.push("(", ...extFilter, ")");
        }

        const { stdout } = await execFileAsync("find", findArgs, {
          timeout: 10000,
          maxBuffer: 2 * 1024 * 1024,
        });
        const paths = stdout.trim().split("\n").filter(Boolean);
        candidatePaths.push(...paths);
      } catch {
        // find may fail on permission errors — continue with other dirs
        continue;
      }
    }
  }

  // Limit total files to scan
  const pathsToScan = candidatePaths.slice(0, maxFiles);
  const matchedFiles: {
    file_id: number;
    name: string;
    path: string;
    ext: string;
    size: string;
    preview: string;
  }[] = [];

  // Read each file's first N bytes and test the regex
  for (const filePath of pathsToScan) {
    try {
      const { stdout } = await execFileAsync(
        "head",
        ["-c", String(previewBytes), filePath],
        {
          timeout: 2000,
          maxBuffer: previewBytes + 1024,
        },
      );

      if (regex.test(stdout)) {
        // File matches! Register it and add to results
        const results = await pathsToResults([filePath], 1);
        if (results.length > 0) {
          const fileIds = registerFiles(results);
          const f = results[0];
          matchedFiles.push({
            file_id: fileIds[0],
            name: f.name,
            path: f.path,
            ext: f.extension,
            size: f.sizeFormatted,
            preview:
              stdout.length > 200 ? stdout.slice(0, 200) + "..." : stdout,
          });
        }
      }
    } catch {
      // Skip files that can't be read (binary, permissions, etc.)
      continue;
    }

    // Stop early if we have enough matches
    if (matchedFiles.length >= 20) break;
  }

  return JSON.stringify({
    count: matchedFiles.length,
    scanned: pathsToScan.length,
    pattern: args.content_pattern,
    directories: scanDirs.map((d) => d.replace(home, "~")),
    files: matchedFiles,
    message:
      matchedFiles.length === 0
        ? `No files matched pattern "${args.content_pattern}" in ${pathsToScan.length} scanned files.`
        : undefined,
  });
}

/**
 * Execute the finish tool. Looks up files from the registry by file_id.
 */
export async function executeFinish(args: FinishArgs): Promise<AgentResult> {
  const ranked: RankedFileResult[] = [];

  for (const entry of args.file_ids) {
    const file = getRegisteredFile(entry.file_id);
    if (file) {
      ranked.push({
        ...file,
        relevanceScore: entry.relevance_score,
        matchReason: entry.match_reason,
      });
    } else {
      console.warn(
        `finish: file_id ${entry.file_id} not found in registry (size=${fileRegistry.length})`,
      );
    }
  }

  // Sort by relevance
  ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    files: ranked,
    summary: args.summary,
    clarifyingQuestions: args.clarifying_questions ?? [],
  };
}

/**
 * Execute a tool by name with the given arguments.
 */
export async function executeTool(
  toolName: string,
  argsJson: string,
): Promise<{ result: string; agentResult?: AgentResult }> {
  const args = JSON.parse(argsJson);

  switch (toolName) {
    case "search_files":
      return { result: await executeSearchFiles(args as SearchFilesArgs) };

    case "find_directories":
      return {
        result: await executeFindDirectories(args as FindDirectoriesArgs),
      };

    case "read_file_preview":
      return {
        result: await executeReadFilePreview(args as ReadFilePreviewArgs),
      };

    case "grep_files":
      return { result: await executeGrepFiles(args as GrepFilesArgs) };

    case "get_file_metadata":
      return {
        result: await executeGetFileMetadata(args as GetFileMetadataArgs),
      };

    case "analyze_image":
      return { result: await executeAnalyzeImage(args as AnalyzeImageArgs) };

    case "list_recent_files":
      return {
        result: await executeListRecentFiles(args as ListRecentFilesArgs),
      };

    case "scan_directory":
      return {
        result: await executeScanDirectory(args as ScanDirectoryArgs),
      };

    case "finish": {
      const agentResult = await executeFinish(args as FinishArgs);
      return {
        result: JSON.stringify({
          status: "done",
          files_count: agentResult.files.length,
        }),
        agentResult,
      };
    }

    default:
      return { result: JSON.stringify({ error: `Unknown tool: ${toolName}` }) };
  }
}
