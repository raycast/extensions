import { environment } from "@raycast/api";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import {
  generateCaseName,
  generateSwapDelimiterName,
  generateTvShowName,
  generateAnimeName,
  generateMovieName,
  generateSequentialName,
  generateFindReplaceName,
  generateChangedExtension,
  generateEnumerateName,
} from "./rename";
import { parseEpisode } from "./episode-parser";

// ─── Data Model ───

export type StepType =
  | "uppercase"
  | "lowercase"
  | "titlecase"
  | "sentencecase"
  | "collapse-spaces"
  | "swap-delimiter"
  | "find-replace"
  | "change-extension"
  | "tv-show"
  | "anime"
  | "movie"
  | "sequential"
  | "enumerate";

export interface ScriptStep {
  type: StepType;
  // Swap delimiter
  fromDelimiter?: string;
  toDelimiter?: string;
  // Find & Replace
  find?: string;
  replace?: string;
  useRegex?: boolean;
  // Change extension
  fromExtension?: string;
  toExtension?: string;
  // TV Show
  showName?: string;
  season?: number;
  startEpisode?: number;
  wordDelimiter?: string;
  suffix?: string;
  // Anime
  animeName?: string;
  startAnimeEpisode?: number;
  group?: string;
  quality?: string;
  // Movie
  movieName?: string;
  year?: string;
  movieQuality?: string;
  // Sequential / Enumerate
  prefix?: string;
  startNumber?: number;
  zeroPad?: number;
  separator?: string;
}

export interface RenameScript {
  id: string;
  name: string;
  description: string;
  fileFilter: string; // glob pattern, empty = all files
  steps: ScriptStep[];
  createdAt: number;
}

// ─── Storage ───

const SCRIPTS_DIR = join(environment.supportPath, "scripts");

async function ensureDir(): Promise<void> {
  await mkdir(SCRIPTS_DIR, { recursive: true });
}

function scriptPath(id: string): string {
  return join(SCRIPTS_DIR, `${id}.json`);
}

export async function saveScript(script: RenameScript): Promise<void> {
  await ensureDir();
  await writeFile(scriptPath(script.id), JSON.stringify(script, null, 2));
}

export async function loadScript(id: string): Promise<RenameScript> {
  const raw = await readFile(scriptPath(id), "utf-8");
  return JSON.parse(raw);
}

export async function deleteScript(id: string): Promise<void> {
  const { unlink } = await import("fs/promises");
  try {
    await unlink(scriptPath(id));
  } catch {
    // ignore if already deleted
  }
}

export async function listScripts(): Promise<RenameScript[]> {
  await ensureDir();
  const { readdir } = await import("fs/promises");
  const entries = await readdir(SCRIPTS_DIR);
  const scripts: RenameScript[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(SCRIPTS_DIR, entry), "utf-8");
      scripts.push(JSON.parse(raw));
    } catch {
      // skip corrupt files
    }
  }
  return scripts.sort((a, b) => b.createdAt - a.createdAt);
}

// ─── Execution Engine ───

function matchesGlob(fileName: string, pattern: string): boolean {
  if (!pattern || pattern === "*" || pattern === "*.*") return true;
  const patterns = pattern.split(",").map((p) => p.trim());
  return patterns.some((p) => {
    let regexStr = p.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".");
    regexStr = regexStr.replace(/\{([^}]+)\}/g, (_, group) => {
      return `(${group.split(",").join("|")})`;
    });
    try {
      return new RegExp(`^${regexStr}$`, "i").test(fileName);
    } catch {
      return false;
    }
  });
}

/**
 * Apply a single step to a filename.
 * For sequential/enumerate steps, `index` is the file's position in the filtered list.
 */
function applyStep(fileName: string, step: ScriptStep, index: number): string {
  switch (step.type) {
    case "uppercase":
      return generateCaseName(fileName, "uppercase", true);
    case "lowercase":
      return generateCaseName(fileName, "lowercase", true);
    case "titlecase":
      return generateCaseName(fileName, "titlecase", true);
    case "sentencecase":
      return generateCaseName(fileName, "sentencecase", true);
    case "collapse-spaces": {
      const ext = extname(fileName);
      const name = fileName.slice(0, fileName.length - ext.length);
      return name.replace(/\s{2,}/g, " ").trim() + ext;
    }
    case "swap-delimiter":
      return generateSwapDelimiterName(fileName, step.fromDelimiter ?? ".", step.toDelimiter ?? " ");
    case "find-replace":
      return generateFindReplaceName(fileName, step.find ?? "", step.replace ?? "", step.useRegex ?? false);
    case "change-extension":
      return generateChangedExtension(fileName, step.fromExtension ?? "", step.toExtension ?? "");
    case "tv-show": {
      // Try to detect episode number from current filename, fall back to index
      const parsed = parseEpisode(fileName);
      const ep = parsed ? parsed.episodeNumber : (step.startEpisode ?? 1) + index;
      return generateTvShowName(
        fileName,
        step.showName ?? "Show",
        step.season ?? 1,
        ep,
        step.wordDelimiter ?? " ",
        step.suffix ?? "",
      );
    }
    case "anime": {
      const parsed = parseEpisode(fileName);
      const ep = parsed ? parsed.episodeNumber : (step.startAnimeEpisode ?? 1) + index;
      return generateAnimeName(fileName, step.animeName ?? "Anime", ep, step.group ?? "", step.quality ?? "");
    }
    case "movie":
      return generateMovieName(
        fileName,
        step.movieName ?? "Movie",
        step.year ?? "",
        step.movieQuality ?? "",
        step.wordDelimiter ?? " ",
      );
    case "sequential":
      return generateSequentialName(
        fileName,
        step.prefix ?? "file",
        (step.startNumber ?? 1) + index,
        step.zeroPad ?? 3,
        step.separator ?? "-",
      );
    case "enumerate":
      return generateEnumerateName(
        fileName,
        step.prefix ?? "",
        (step.startNumber ?? 1) + index,
        step.zeroPad ?? 3,
        step.separator ?? "-",
      );
    default:
      return fileName;
  }
}

export interface ScriptResult {
  original: string;
  renamed: string;
  matched: boolean; // whether it passed the file filter
}

/**
 * Execute a script against a list of files. Returns results for ALL files
 * (matched ones get renamed, unmatched stay as-is).
 */
export function executeScript(files: string[], script: RenameScript): ScriptResult[] {
  return files.map((fileName) => {
    const matched = matchesGlob(fileName, script.fileFilter);
    if (!matched) {
      return { original: fileName, renamed: fileName, matched: false };
    }

    // Get the index among matched files only (for sequential/enumerate steps)
    const matchedFiles = files.filter((f) => matchesGlob(f, script.fileFilter));
    const matchedIndex = matchedFiles.indexOf(fileName);

    let current = fileName;
    for (const step of script.steps) {
      current = applyStep(current, step, matchedIndex);
    }

    return { original: fileName, renamed: current, matched: true };
  });
}

// ─── Step Labels ───

export function stepLabel(step: ScriptStep): string {
  switch (step.type) {
    case "uppercase":
      return "UPPERCASE";
    case "lowercase":
      return "lowercase";
    case "titlecase":
      return "Title Case";
    case "sentencecase":
      return "Sentence case";
    case "collapse-spaces":
      return "Collapse spaces";
    case "swap-delimiter":
      return `"${step.fromDelimiter}" → "${step.toDelimiter}"`;
    case "find-replace":
      return `Find "${step.find}" → "${step.replace}"${step.useRegex ? " (regex)" : ""}`;
    case "change-extension":
      return `${step.fromExtension || "*"} → .${step.toExtension}`;
    case "tv-show":
      return `TV Show: ${step.showName} S${String(step.season ?? 1).padStart(2, "0")}`;
    case "anime":
      return `Anime: ${step.animeName}`;
    case "movie":
      return `Movie: ${step.movieName}`;
    case "sequential":
      return `Sequential: ${step.prefix}-###`;
    case "enumerate":
      return `Enumerate: ${step.prefix ? step.prefix + "-" : ""}###`;
    default:
      return step.type;
  }
}

export function stepTypeLabel(type: StepType): string {
  const labels: Record<StepType, string> = {
    uppercase: "UPPERCASE",
    lowercase: "lowercase",
    titlecase: "Title Case",
    sentencecase: "Sentence Case",
    "collapse-spaces": "Collapse Multiple Spaces",
    "swap-delimiter": "Swap Delimiter",
    "find-replace": "Find & Replace",
    "change-extension": "Change Extension",
    "tv-show": "Rename as TV Show",
    anime: "Rename as Anime",
    movie: "Rename as Movie",
    sequential: "Rename Sequentially",
    enumerate: "Auto Enumerate",
  };
  return labels[type] || type;
}
