import { Cache, environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import readline from "readline";
import type {
  IndexedFile,
  IndexedGame,
  ManifestIndex,
  OS,
  PathTag,
} from "./types";

const MANIFEST_URL =
  "https://raw.githubusercontent.com/mtkennerly/ludusavi-manifest/master/data/manifest.yaml";
// Persistent paths inside Raycast's dedicated support directory for this extension.
const MANIFEST_FILE = path.join(environment.supportPath, "manifest.yaml");
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

// Download the manifest YAML and stream it straight to disk — no JS heap involvement.
async function downloadManifestFile(
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

  fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });

  const dest = fs.createWriteStream(MANIFEST_FILE);
  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await new Promise<void>((resolve, reject) =>
        dest.write(value, (err: Error | null | undefined) =>
          err ? reject(err) : resolve(),
        ),
      );
    }
  } catch (err) {
    dest.destroy();
    fs.unlink(MANIFEST_FILE, () => undefined);
    throw err;
  }

  await new Promise<void>((resolve, reject) => {
    dest.once("finish", resolve);
    dest.once("error", reject);
    dest.end();
  });
}

// Stream-parse the manifest and write each game entry directly to a JSON file.
// At no point is the full index held in memory — only one entry at a time.
// Pauses readline every LINES_PER_TICK to keep the V8 event loop alive.
function buildIndexToFile(onProgress?: (msg: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(INDEX_FILE);
    let firstEntry = true;
    let entryLines: string[] = [];
    let gameCount = 0;
    let lineCount = 0;

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

    const rl = readline.createInterface({
      input: fs.createReadStream(MANIFEST_FILE),
      crlfDelay: Infinity,
    });

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
      flushEntry();
      dest.once("finish", resolve);
      dest.once("error", reject);
      dest.end("}");
    });

    rl.on("error", (err) => {
      dest.destroy();
      reject(err);
    });
  });
}

export async function loadManifest(
  onProgress?: (msg: string) => void,
): Promise<ManifestIndex> {
  if (isCacheValid() && fs.existsSync(INDEX_FILE)) {
    onProgress?.("Loading cached manifest...");
    const json = await fs.promises.readFile(INDEX_FILE, "utf8");
    return JSON.parse(json) as ManifestIndex;
  }

  if (!fs.existsSync(MANIFEST_FILE) || !isCacheValid()) {
    await downloadManifestFile(onProgress);
  }

  onProgress?.("Parsing game database...");
  await buildIndexToFile(onProgress);

  cache.set(CACHE_KEY_TIMESTAMP, Date.now().toString());

  onProgress?.("Loading manifest...");
  const json = await fs.promises.readFile(INDEX_FILE, "utf8");
  return JSON.parse(json) as ManifestIndex;
}

export async function refreshManifest(
  onProgress?: (msg: string) => void,
): Promise<ManifestIndex> {
  cache.remove(CACHE_KEY_TIMESTAMP);
  return loadManifest(onProgress);
}
