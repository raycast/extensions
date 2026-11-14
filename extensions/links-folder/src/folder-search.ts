import { execFile } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { rankByQuery } from "./search";

// Finds folders by name anywhere under the home directory (which includes iCloud Drive).
// On macOS this asks Spotlight, which is already indexed and answers in a fraction of a second.
// Elsewhere it falls back to a bounded scan of the home directory (SCAN_LEVELS levels deep), which is
// why the UI states that limit there. Searches can be cancelled so old queries stop using the disk.

const MAX_RESULTS = 50;
const MAX_CANDIDATES = 2000; // ranked before the (slower) write-access check
export const SCAN_LEVELS = 6;
const MAX_SCAN_FOLDERS = 20000;
const SPOTLIGHT_TIMEOUT_MS = 5000;

// App data under ~/Library is noise, except iCloud Drive and the cloud storage providers
const ALLOWED_LIBRARY_FOLDERS = [
  ["Library", "Mobile Documents", "com~apple~CloudDocs"],
  ["Library", "CloudStorage"],
];

function isExcluded(folder: string, home: string): boolean {
  const segments = path.relative(home, folder).split(path.sep);
  if (segments.some((segment) => segment.startsWith(".") || segment === "node_modules")) return true;
  if (process.platform !== "darwin" || segments[0] !== "Library") return false;
  return !ALLOWED_LIBRARY_FOLDERS.some((allowed) => allowed.every((segment, index) => segments[index] === segment));
}

function isWritable(folder: string): boolean {
  try {
    fs.accessSync(folder, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function searchWithSpotlight(tokens: string[], home: string, signal?: AbortSignal): Promise<string[]> {
  // Every word has to appear in the folder name; "cd" makes the match case and diacritic insensitive
  const query = [
    'kMDItemContentType == "public.folder"',
    ...tokens.map((token) => `kMDItemFSName == "*${token}*"cd`),
  ].join(" && ");

  return new Promise((resolve) => {
    execFile(
      "/usr/bin/mdfind",
      ["-onlyin", home, query],
      { maxBuffer: 32 * 1024 * 1024, timeout: SPOTLIGHT_TIMEOUT_MS, signal },
      (_error, stdout) =>
        resolve(
          signal?.aborted
            ? []
            : String(stdout ?? "")
                .split("\n")
                .filter(Boolean),
        ),
    );
  });
}

async function searchByScanning(tokens: string[], home: string, signal?: AbortSignal): Promise<string[]> {
  const found: string[] = [];
  let level = [home];
  let visited = 0;

  for (let depth = 0; depth < SCAN_LEVELS && level.length > 0 && visited < MAX_SCAN_FOLDERS; depth++) {
    const nextLevel: string[] = [];

    for (const dir of level) {
      if (signal?.aborted) return [];
      if (visited++ >= MAX_SCAN_FOLDERS) break;

      let entries: fs.Dirent[];
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "node_modules") continue;
        // AppData is hidden by Windows and huge, it would use up the scan budget for nothing
        if (dir === home && entry.name === "AppData") continue;
        const folder = path.join(dir, entry.name);
        nextLevel.push(folder);
        const name = entry.name.toLowerCase();
        if (tokens.every((token) => name.includes(token))) found.push(folder);
      }
    }

    level = nextLevel;
  }

  return found;
}

export async function searchFolders(query: string, signal?: AbortSignal): Promise<string[]> {
  // Quotes, backslashes and asterisks have a meaning in Spotlight queries, so they are dropped
  const tokens = query
    .toLowerCase()
    .replace(/["\\*]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return [];

  const home = os.homedir();
  const matches =
    process.platform === "darwin"
      ? await searchWithSpotlight(tokens, home, signal)
      : await searchByScanning(tokens, home, signal);
  if (signal?.aborted) return [];

  const candidates = matches
    .filter((folder) => !isExcluded(folder, home))
    .sort((a, b) => a.length - b.length) // shallower folders first when the name matches equally well
    .slice(0, MAX_CANDIDATES);

  return rankByQuery(candidates, query, (folder) => ({ primary: path.basename(folder) }))
    .filter(isWritable)
    .slice(0, MAX_RESULTS);
}
