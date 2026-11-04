import { Cache, environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import path from "path";
import readline from "readline";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import type {
  IndexedFile,
  IndexedGame,
  ManifestIndex,
  OS,
  PathTag,
} from "./types";

const MANIFEST_URL =
  "https://raw.githubusercontent.com/mtkennerly/ludusavi-manifest/master/data/manifest.yaml";
// Persistent path inside Raycast's dedicated support directory for this extension.
const INDEX_FILE = path.join(environment.supportPath, "manifest-index.json");

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_KEY_TIMESTAMP = "manifest-timestamp";

// Tiny cache — stores only the timestamp string, not the full index
const cache = new Cache({ capacity: 256 });

// Filter to the current platform at index time — halves the data volume
const CURRENT_OS: OS = process.platform === "win32" ? "windows" : "mac";

const LINES_PER_TICK = 5000;

function isCacheValid(): boolean {
  const ts = cache.get(CACHE_KEY_TIMESTAMP);
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < CACHE_MAX_AGE_MS;
}

// Extract the string value of a YAML mapping key from trimmed line content.
// Handles quoted ("Some: Name":) and unquoted (SomeName:) forms.
function extractKey(content: string): string {
  if (content.startsWith('"')) {
    let i = 1;
    while (i < content.length && content[i] !== '"') {
      if (content[i] === "\\") i++; // skip escaped char
      i++;
    }
    return content.slice(1, i);
  }
  return content.endsWith(":") ? content.slice(0, -1).trim() : content;
}

// Parse a single game entry's lines without any YAML library.
// Filters out file entries that target a different OS — keeps only
// os-agnostic entries and entries matching CURRENT_OS.
function parseEntryLines(entryLines: string[]): IndexedGame | null {
  const files: IndexedFile[] = [];
  const installDirs: string[] = [];
  let steamId: number | undefined;
  let gogId: number | undefined;

  type Section = "files" | "installDir" | "steam" | "gog" | "other";
  let section: Section = "other";

  let filePath: string | null = null;
  let fileTags: PathTag[] = [];
  let fileWhen: Array<{ os?: string; store?: string }> = [];
  let fileSubSection: "tags" | "when" | "other" = "other";

  function flushFile() {
    if (filePath !== null && fileTags.length > 0) {
      if (fileWhen.length === 0) {
        // No OS restriction — valid for any platform
        files.push({ template: filePath, tags: fileTags });
      } else {
        for (const cond of fileWhen) {
          // Skip entries that only apply to a different OS
          if (cond.os && cond.os !== CURRENT_OS) continue;
          files.push({
            template: filePath,
            tags: fileTags,
            os: cond.os as OS | undefined,
            store: cond.store,
          });
        }
      }
    }
    filePath = null;
    fileTags = [];
    fileWhen = [];
    fileSubSection = "other";
  }

  // Skip index 0 — that's the game name line, already extracted by the caller
  for (let i = 1; i < entryLines.length; i++) {
    const line = entryLines[i];
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.length - trimmed.length;
    const content = trimmed.endsWith("\r") ? trimmed.slice(0, -1) : trimmed;

    if (indent === 2) {
      flushFile();
      if (content === "files:") section = "files";
      else if (content === "installDir:") section = "installDir";
      else if (content === "steam:") section = "steam";
      else if (content === "gog:") section = "gog";
      else section = "other";
    } else if (indent === 4) {
      if (section === "files") {
        flushFile();
        filePath = extractKey(content);
      } else if (section === "installDir") {
        installDirs.push(extractKey(content));
      } else if (section === "steam" || section === "gog") {
        const m = content.match(/^id:\s*(\d+)/);
        if (m) {
          const id = parseInt(m[1], 10);
          if (section === "steam") steamId = id;
          else gogId = id;
        }
      }
    } else if (indent === 6) {
      if (section === "files" && filePath !== null) {
        if (content === "tags:") fileSubSection = "tags";
        else if (content === "when:") fileSubSection = "when";
        else fileSubSection = "other";
      }
    } else if (indent === 8) {
      if (section === "files" && filePath !== null) {
        if (fileSubSection === "tags" && content.startsWith("- ")) {
          fileTags.push(content.slice(2) as PathTag);
        } else if (fileSubSection === "when" && content.startsWith("- ")) {
          const rest = content.slice(2);
          const item: { os?: string; store?: string } = {};
          const osM = rest.match(/os:\s*([^\s,}]+)/);
          const stM = rest.match(/store:\s*([^\s,}]+)/);
          if (osM) item.os = osM[1];
          if (stM) item.store = stM[1];
          fileWhen.push(item);
        }
      }
    } else if (indent === 10) {
      if (
        section === "files" &&
        filePath !== null &&
        fileSubSection === "when" &&
        fileWhen.length > 0
      ) {
        const item = fileWhen[fileWhen.length - 1];
        const osM = content.match(/os:\s*([^\s,}]+)/);
        const stM = content.match(/store:\s*([^\s,}]+)/);
        if (osM) item.os = osM[1];
        if (stM) item.store = stM[1];
      }
    }
  }

  flushFile();

  if (files.length === 0) return null;
  return { steamId, gogId, installDirs, files };
}

// Download the manifest YAML and stream it straight to disk, with no JS heap involvement.
async function downloadManifestFile(
  target: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  onProgress?.("Downloading game database...");

  const response = await fetch(MANIFEST_URL, {
    // Disable compression: avoids V8's internal decompressor which can spike heap
    headers: { "Accept-Encoding": "identity" },
  });
  if (!response.ok)
    throw new Error(`HTTP ${response.status} downloading manifest`);
  if (!response.body) throw new Error("Response has no body");

  await pipeline(
    Readable.fromWeb(response.body as WebReadableStream<Uint8Array>),
    fs.createWriteStream(target),
  );
}

// Stream-parse the manifest and write each game entry directly to a JSON file.
// At no point is the full index held in memory, only one entry at a time.
// Pauses readline every LINES_PER_TICK to keep the V8 event loop alive.
function buildIndexToFile(
  source: string,
  target: string,
  onProgress?: (msg: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(source);
    const dest = fs.createWriteStream(target);
    const rl = readline.createInterface({ input, crlfDelay: Infinity });
    let failed = false;
    let firstEntry = true;
    let entryLines: string[] = [];
    let gameCount = 0;
    let lineCount = 0;

    function fail(err: Error) {
      if (failed) return;
      failed = true;
      rl.close();
      input.destroy();
      dest.destroy();
      reject(err);
    }
    input.once("error", fail);
    dest.once("error", fail);

    dest.write("{");

    function flushEntry() {
      if (entryLines.length === 0) return;
      const gameName = extractKey(entryLines[0].trim());
      if (gameName) {
        const indexed = parseEntryLines(entryLines);
        if (indexed) {
          const sep = firstEntry ? "" : ",";
          dest.write(
            `${sep}${JSON.stringify(gameName)}:${JSON.stringify(indexed)}`,
          );
          firstEntry = false;
        }
      }
      gameCount++;
      if (gameCount % 2000 === 0) {
        onProgress?.(
          `Indexing game database... (${gameCount.toLocaleString()} games)`,
        );
      }
      entryLines = [];
    }

    rl.on("line", (line) => {
      lineCount++;

      if (line.length > 0 && line[0] !== " " && line[0] !== "\t") {
        flushEntry();
        entryLines = [line]; // all root-level lines are game names (quoted or unquoted)
      } else if (entryLines.length > 0) {
        entryLines.push(line);
      }

      if (lineCount % LINES_PER_TICK === 0) {
        rl.pause();
        setImmediate(() => rl.resume());
      }
    });

    rl.on("close", () => {
      if (failed) return;
      flushEntry();
      dest.once("finish", resolve);
      dest.end("}");
    });
  });
}

let pendingUpdate: Promise<void> | null = null;

/**
 * Downloads and re-indexes the manifest. Concurrent calls share one run, and the index is replaced only once complete.
 */
export function updateManifest(
  onProgress?: (msg: string) => void,
): Promise<void> {
  pendingUpdate ??= runUpdate(onProgress).finally(() => {
    pendingUpdate = null;
  });
  return pendingUpdate;
}

async function runUpdate(onProgress?: (msg: string) => void): Promise<void> {
  await fs.promises.mkdir(environment.supportPath, { recursive: true });
  const stamp = `${process.pid}-${Date.now()}`;
  const yamlTmp = path.join(
    environment.supportPath,
    `manifest-${stamp}.yaml.tmp`,
  );
  const indexTmp = `${INDEX_FILE}.${stamp}.tmp`;

  try {
    await downloadManifestFile(yamlTmp, onProgress);
    onProgress?.("Parsing game database...");
    await buildIndexToFile(yamlTmp, indexTmp, onProgress);
    await fs.promises.rename(indexTmp, INDEX_FILE);
    cache.set(CACHE_KEY_TIMESTAMP, Date.now().toString());
  } finally {
    await fs.promises.rm(yamlTmp, { force: true });
    await fs.promises.rm(indexTmp, { force: true });
  }
}

/**
 * Loads the index, updating it first when it is older than 7 days or `force` is set.
 * @remarks If the update fails and an older index exists, that index is returned with `outdated` set and a toast says so.
 */
export async function loadManifestResult(
  onProgress?: (msg: string) => void,
  force = false,
): Promise<{ manifest: ManifestIndex; outdated: boolean }> {
  let outdated = false;
  if (force || !isCacheValid() || !fs.existsSync(INDEX_FILE)) {
    try {
      await updateManifest(onProgress);
    } catch (err) {
      if (!fs.existsSync(INDEX_FILE)) throw err;
      outdated = true;
      const reason = err instanceof Error ? err.message : String(err);
      await showFailureToast(err, {
        title: "Could not update the game database",
        message: `${reason}. Showing the copy saved earlier, which may be outdated.`,
      });
    }
  }

  onProgress?.("Loading game database...");
  const json = await fs.promises.readFile(INDEX_FILE, "utf8");
  return { manifest: JSON.parse(json) as ManifestIndex, outdated };
}

export async function loadManifest(
  onProgress?: (msg: string) => void,
  force = false,
): Promise<ManifestIndex> {
  return (await loadManifestResult(onProgress, force)).manifest;
}

export function refreshManifest(
  onProgress?: (msg: string) => void,
): Promise<ManifestIndex> {
  return loadManifest(onProgress, true);
}
