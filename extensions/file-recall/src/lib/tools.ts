import {
  ToolDefinition,
  RankedFileResult,
  AgentResult,
  FileResult,
} from "./types";
import { runMdfind, pathsToResults, findDirectories } from "./file-search";
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

/**
 * Reset the file registry. Call at the start of each agent run.
 */
export function resetFileRegistry(): void {
  fileRegistry = [];
}

/**
 * Get all files currently in the registry (for partial results on cancel).
 */
export function getRegisteredFiles(): FileResult[] {
  return [...fileRegistry];
}

/**
 * Add files to the registry. Returns the starting index.
 */
function registerFiles(files: FileResult[]): number {
  const startIdx = fileRegistry.length;
  fileRegistry.push(...files);
  return startIdx;
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
        "Search for files using macOS Spotlight. Returns files with file_id. Use file_id in other tools and finish.",
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
        "Read content of a text file. Supports offset for jumping to specific sections, and search_term to find and show content around a specific keyword.",
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
        "Use this to verify if files actually contain the content the user is looking for.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description:
              "Text pattern to search for (case-insensitive). Supports basic regex.",
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

/**
 * Execute the search_files tool.
 *
 * Uses progressive widening: tries the most specific query first,
 * then relaxes conditions step by step until results are found.
 */
export async function executeSearchFiles(
  args: SearchFilesArgs,
): Promise<string> {
  const configDirs = getSearchDirs();
  const { keywordCond, nameCond, typeCond, dateCond } = buildQueryParts(args);

  // Determine search directories
  let searchIn: string[] = [];
  if (args.directory) {
    const dir = args.directory.replace(/^~/, process.env.HOME || "~");
    searchIn = [dir];
  } else {
    searchIn = configDirs;
  }

  const maxResults =
    parseInt(getPreferenceValues<Preferences.RecallFile>().maxResults) || 20;

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

  // Execute queries progressively until we find results
  const allPaths = new Set<string>();

  for (const query of queries) {
    try {
      console.log(`mdfind query: ${query}`);
      const paths = await runMdfind(query, searchIn);
      for (const p of paths) allPaths.add(p);

      if (allPaths.size >= maxResults) break;
    } catch {
      continue;
    }
  }

  // If still nothing and we had a directory scope, try without it
  if (allPaths.size === 0 && searchIn.length > 0 && contentCond) {
    console.log("Retrying without directory scope...");
    try {
      const paths = await runMdfind(contentCond, []);
      for (const p of paths) allPaths.add(p);
    } catch {
      // ignore
    }
  }

  const uniquePaths = [...allPaths].slice(0, maxResults * 2);
  const results = await pathsToResults(uniquePaths, maxResults);

  if (results.length === 0) {
    return JSON.stringify({
      count: 0,
      files: [],
      message: "No files found matching the criteria.",
    });
  }

  // Register files and return with IDs
  const startIdx = registerFiles(results);
  const fileInfos = results.map((f, i) => ({
    file_id: startIdx + i,
    name: f.name,
    path: f.path,
    ext: f.extension,
    size: f.sizeFormatted,
    modified: f.modifiedAt.toISOString().split("T")[0],
    created: f.createdAt.toISOString().split("T")[0],
  }));

  return JSON.stringify({ count: results.length, files: fileInfos });
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
    // grep recursively in directory
    const dir = args.path.replace(/^~/, process.env.HOME || "~");
    try {
      const { stdout } = await execFileAsync(
        "grep",
        [
          "-ril",
          "--include=*.{txt,log,md,json,csv,js,ts,py,go,java,sql,html,css,xml,yaml,yml,toml,cfg,conf,ini,sh}",
          args.pattern,
          dir,
        ],
        { timeout: 10000, maxBuffer: 1024 * 1024 },
      );
      const paths = stdout.trim().split("\n").filter(Boolean).slice(0, 20);
      for (const p of paths) {
        const name = p.split("/").pop() || p;
        filesToSearch.push({ path: p, name });
      }
    } catch {
      // grep returns exit code 1 if no matches - that's ok
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
  for (const fileInfo of filesToSearch) {
    try {
      const { stdout } = await execFileAsync(
        "grep",
        [
          "-in",
          `--max-count=${maxMatchesPerFile}`,
          args.pattern,
          fileInfo.path,
        ],
        { timeout: 5000, maxBuffer: 512 * 1024 },
      );

      const matchLines = stdout.trim().split("\n").filter(Boolean);
      const matches = matchLines.map((line) => {
        const colonIdx = line.indexOf(":");
        const lineNum = parseInt(line.substring(0, colonIdx)) || 0;
        const content = line.substring(colonIdx + 1).trim();
        return {
          line_number: lineNum,
          content:
            content.length > 200 ? content.slice(0, 200) + "..." : content,
        };
      });

      if (matches.length > 0) {
        totalMatches += matches.length;
        results.push({
          file_id: fileInfo.fileId,
          path: fileInfo.path,
          name: fileInfo.name,
          matches,
        });
      }
    } catch {
      // grep exit code 1 = no match, that's normal
      continue;
    }
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

    // Register and return
    const startIdx = registerFiles(results);
    const fileInfos = results.map((f, i) => ({
      file_id: startIdx + i,
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
