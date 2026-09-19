import { getApplications, type Application } from "@raycast/api";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

/**
 * How many file candidates we offer Jev to choose from. Kept comfortably
 * under Choice's 255-option cap; in practice the three watched folders
 * (plus one level of subfolders) rarely come close to this for a personal
 * machine, so nothing relevant gets truncated away.
 */
const MAX_FILE_CANDIDATES = 150;
/** Hard safety cap on raw files scanned before scoring, in case a watched folder is huge. */
const MAX_FILES_SCANNED = 4000;
/** How deep into subfolders of Downloads/Desktop/Documents we look. */
const SCAN_DEPTH = 1;

const FOLDERS_TO_SCAN = ["Downloads", "Desktop", "Documents"];

const FILE_TYPE_EXTENSIONS: Record<string, string[]> = {
  pdf: [".pdf"],
  image: [".png", ".jpg", ".jpeg", ".gif", ".heic", ".webp", ".tiff", ".svg"],
  document: [
    ".doc",
    ".docx",
    ".pages",
    ".txt",
    ".rtf",
    ".md",
    ".odt",
    ".key",
    ".numbers",
    ".xlsx",
    ".csv",
  ],
  archive: [".zip", ".tar", ".gz", ".rar", ".7z", ".dmg"],
};

export type FileCandidate = {
  /** Stable label shown to Jev and the user, e.g. "Downloads/invoice.pdf". */
  label: string;
  absolutePath: string;
  mtimeMs: number;
};

let appsCache: Application[] | null = null;

/** Installed applications, used to build a Choice candidate set (select, don't generate). */
export async function listInstalledApps(): Promise<Application[]> {
  if (appsCache) return appsCache;
  appsCache = await getApplications();
  return appsCache;
}

async function collectFiles(
  absoluteDir: string,
  label: string,
  depth: number,
  scanned: { count: number },
): Promise<FileCandidate[]> {
  if (scanned.count >= MAX_FILES_SCANNED) return [];
  let entries;
  try {
    entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: FileCandidate[] = [];
  for (const entry of entries) {
    if (scanned.count >= MAX_FILES_SCANNED) break;
    if (entry.name.startsWith(".")) continue;
    const absolutePath = path.join(absoluteDir, entry.name);
    const entryLabel = `${label}/${entry.name}`;

    if (entry.isFile()) {
      scanned.count += 1;
      try {
        const stat = await fs.stat(absolutePath);
        files.push({ label: entryLabel, absolutePath, mtimeMs: stat.mtimeMs });
      } catch {
        // File may have been removed/renamed between readdir and stat; skip it.
      }
    } else if (entry.isDirectory() && depth > 0) {
      files.push(
        ...(await collectFiles(absolutePath, entryLabel, depth - 1, scanned)),
      );
    }
  }
  return files;
}

async function listFilesIn(
  dirName: string,
  depth = 0,
): Promise<FileCandidate[]> {
  const dir = path.join(os.homedir(), dirName);
  return collectFiles(dir, dirName, depth, { count: 0 });
}

const STOPWORDS = new Set([
  "open",
  "the",
  "a",
  "an",
  "my",
  "i",
  "me",
  "please",
  "find",
  "show",
  "get",
  "for",
  "to",
  "of",
  "that",
  "this",
  "is",
  "was",
  "file",
  "files",
  "recent",
  "recently",
  "last",
  "downloaded",
  "download",
  "it",
  "on",
  "in",
  "at",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

/** Recency in [0, 1] (1 = just now, decaying to ~0 past ~90 days) plus a boost for filename/query keyword overlap. */
function scoreFile(
  file: FileCandidate,
  queryTokens: string[],
  now: number,
): number {
  const ageDays = (now - file.mtimeMs) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 1 - ageDays / 90);
  const nameLower = path.basename(file.absolutePath).toLowerCase();
  const keywordScore = queryTokens.some((token) => nameLower.includes(token))
    ? 3
    : 0;
  return recencyScore + keywordScore;
}

/**
 * Candidate files for Jev to choose from: everything in the watched folders
 * (one level of subfolders included), ranked by a mix of recency and
 * filename/query keyword overlap so an older-but-named-matching file (e.g.
 * a résumé you haven't touched in months) still makes the cut over a pile
 * of unrelated recent downloads. Jev still does the actual semantic
 * matching (e.g. "cv" ~ "resume") — this only decides what it gets to see.
 */
export async function listFileCandidates(
  query: string,
  limit = MAX_FILE_CANDIDATES,
): Promise<FileCandidate[]> {
  const perFolder = await Promise.all(
    FOLDERS_TO_SCAN.map((folder) => listFilesIn(folder, SCAN_DEPTH)),
  );
  const all = perFolder.flat();
  const queryTokens = tokenize(query);
  const now = Date.now();

  return all
    .map((file) => ({ file, score: scoreFile(file, queryTokens, now) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.file);
}

function matchesFileType(fileName: string, fileType: string): boolean {
  if (fileType === "any") return true;
  const extensions = FILE_TYPE_EXTENSIONS[fileType];
  if (!extensions) return true;
  const lower = fileName.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

const RANK_TO_INDEX: Record<string, number> = {
  newest: 0,
  second_newest: 1,
  third_newest: 2,
  oldest: -1,
};

/** A file in ~/Downloads matching a file type, picked by recency rank. Deterministic — no AI needed here. */
export async function findDownload(
  fileType: string,
  rank: string,
): Promise<FileCandidate | null> {
  const downloadFiles = await listFilesIn("Downloads");
  const matching = downloadFiles.filter((f) =>
    matchesFileType(path.basename(f.absolutePath), fileType),
  );
  if (matching.length === 0) return null;
  matching.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const index = RANK_TO_INDEX[rank] ?? 0;
  return matching[index < 0 ? matching.length - 1 : index] ?? null;
}

/** Curated shortcuts for sites whose canonical URL isn't just "<name>.com". */
export const SITE_TABLE: Record<string, string> = {
  github: "https://github.com",
  gmail: "https://mail.google.com",
  google: "https://google.com",
  "google drive": "https://drive.google.com",
  "google docs": "https://docs.google.com",
  "google sheets": "https://sheets.google.com",
  "google calendar": "https://calendar.google.com",
  "google maps": "https://maps.google.com",
  youtube: "https://youtube.com",
  twitter: "https://x.com",
  x: "https://x.com",
  facebook: "https://facebook.com",
  instagram: "https://instagram.com",
  linkedin: "https://linkedin.com",
  notion: "https://notion.so",
  chatgpt: "https://chatgpt.com",
  claude: "https://claude.ai",
  amazon: "https://amazon.com",
  reddit: "https://reddit.com",
  slack: "https://slack.com",
  spotify: "https://open.spotify.com",
  netflix: "https://netflix.com",
  whatsapp: "https://web.whatsapp.com",
  discord: "https://discord.com",
  figma: "https://figma.com",
  dropbox: "https://dropbox.com",
  outlook: "https://outlook.com",
  icloud: "https://icloud.com",
  wikipedia: "https://wikipedia.org",
  "stack overflow": "https://stackoverflow.com",
  twitch: "https://twitch.tv",
  pinterest: "https://pinterest.com",
  tiktok: "https://tiktok.com",
};

const DOMAIN_REGEX =
  /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)\b/i;

/** Deterministic parsing: if the text already contains an explicit URL/domain, use it directly. */
export function extractDomainFromText(query: string): string | null {
  const match = query.match(DOMAIN_REGEX);
  if (!match) return null;
  const raw = match[1];
  return raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `https://${raw}`;
}

const URL_GUESS_STOPWORDS = new Set([
  "open",
  "go",
  "goto",
  "to",
  "visit",
  "launch",
  "navigate",
  "the",
  "a",
  "an",
  "please",
  "website",
  "site",
  "page",
  "my",
]);

/**
 * Last-resort deterministic guess for a single clear brand/word (e.g. "open
 * facebook" -> facebook.com) when it's neither an explicit URL nor in
 * SITE_TABLE. Only fires for exactly one leftover word, to avoid inventing
 * nonsense domains from longer, more ambiguous phrases.
 */
export function guessDomainFromText(query: string): string | null {
  const words = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0 && !URL_GUESS_STOPWORDS.has(word));
  if (words.length !== 1 || words[0].length < 3) return null;
  return `https://${words[0]}.com`;
}
