import { environment, getPreferenceValues } from "@raycast/api";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  createWriteStream,
  readFileSync,
  renameSync,
  unlinkSync,
} from "fs";
import { createHash } from "crypto";
import { execFile } from "child_process";
import { join } from "path";
import { get } from "https";

const GITHUB_REPO = "Roderick111/findr";
const FINDR_BINARY = "findr-macos-universal";
const FINDR_OCR_BINARY = "findr-ocr-macos-universal";

/** Directory for downloaded binaries (persists across extension updates). */
function binDir(): string {
  const dir = join(environment.supportPath, "bin");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** Download a file from a URL, following redirects. Downloads to a temp file
 *  first, then renames on success. On failure the temp file is deleted so
 *  a broken download never blocks future retries. */
function downloadFile(url: string, dest: string): Promise<void> {
  const tmp = dest + ".tmp";
  return new Promise((resolve, reject) => {
    const file = createWriteStream(tmp);
    const fail = (err: Error) => {
      file.close();
      try {
        unlinkSync(tmp);
      } catch {
        /* already gone */
      }
      reject(err);
    };
    const request = (u: string) => {
      get(u, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          const location = res.headers.location;
          res.resume(); // drain redirect response to release socket
          if (location) {
            request(location);
            return;
          }
        }
        if (res.statusCode !== 200) {
          fail(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          try {
            renameSync(tmp, dest);
            resolve();
          } catch (err) {
            fail(err as Error);
          }
        });
      }).on("error", fail);
    };
    request(url);
  });
}

/** Compute SHA-256 hex digest of a file. */
function sha256File(filePath: string): string {
  const data = readFileSync(filePath);
  return createHash("sha256").update(data).digest("hex");
}

/** Fetch text content from a URL, following redirects. Returns null on any error. */
function fetchText(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const request = (u: string) => {
      get(u, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          const location = res.headers.location;
          res.resume();
          if (location) {
            request(location);
            return;
          }
        }
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => resolve(data));
      }).on("error", () => resolve(null));
    };
    request(url);
  });
}

/** Parse checksums.txt (format: "sha256  filename" per line) into a map. */
function parseChecksums(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Format: hash followed by two spaces and filename
    const match = trimmed.match(/^([a-f0-9]{64})\s+(.+)$/);
    if (match) {
      map.set(match[2], match[1]);
    }
  }
  return map;
}

/** Verify a downloaded file against expected checksum. Deletes file on mismatch. */
function verifyChecksum(
  filePath: string,
  filename: string,
  checksums: Map<string, string> | null,
): void {
  if (!checksums) return;
  const expected = checksums.get(filename);
  if (!expected) {
    console.warn(`No checksum entry for ${filename}, skipping verification`);
    return;
  }
  const actual = sha256File(filePath);
  if (actual !== expected) {
    try {
      unlinkSync(filePath);
    } catch {
      /* best effort */
    }
    throw new Error(
      `Checksum mismatch for ${filename}: expected ${expected}, got ${actual}`,
    );
  }
  console.log(`Checksum verified for ${filename}`);
}

/** Download findr binaries from the latest GitHub Release. */
export async function ensureFindrBinaries(): Promise<string> {
  const dir = binDir();
  const findrPath = join(dir, "findr");
  const ocrPath = join(dir, "findr-ocr");

  if (existsSync(findrPath)) {
    return findrPath;
  }

  // Fetch latest release download URLs from GitHub API
  const releaseUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
  const release: { assets: { name: string; browser_download_url: string }[] } =
    await new Promise((resolve, reject) => {
      get(
        releaseUrl,
        {
          headers: {
            "User-Agent": "findr-raycast",
            Accept: "application/json",
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk: string) => (data += chunk));
          res.on("end", () => {
            if (res.statusCode !== 200) {
              reject(
                new Error(
                  `GitHub API error: HTTP ${res.statusCode}${res.statusCode === 403 ? " (rate limit — try again later)" : ""}`,
                ),
              );
              return;
            }
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error("Failed to parse GitHub release"));
            }
          });
        },
      ).on("error", reject);
    });

  const findrAsset = release.assets?.find((a) => a.name === FINDR_BINARY);
  const ocrAsset = release.assets?.find((a) => a.name === FINDR_OCR_BINARY);
  const checksumAsset = release.assets?.find((a) => a.name === "checksums.txt");

  if (!findrAsset) {
    throw new Error("findr binary not found in latest GitHub release");
  }

  // Try to fetch checksums.txt from the release (optional, backwards compatible)
  let checksums: Map<string, string> | null = null;
  if (checksumAsset) {
    const content = await fetchText(checksumAsset.browser_download_url);
    if (content) {
      checksums = parseChecksums(content);
    }
  } else {
    console.warn(
      "No checksums.txt in release, skipping integrity verification",
    );
  }

  await downloadFile(findrAsset.browser_download_url, findrPath);
  verifyChecksum(findrPath, FINDR_BINARY, checksums);
  chmodSync(findrPath, 0o755);

  if (ocrAsset) {
    await downloadFile(ocrAsset.browser_download_url, ocrPath);
    verifyChecksum(ocrPath, FINDR_OCR_BINARY, checksums);
    chmodSync(ocrPath, 0o755);
  }

  return findrPath;
}

let chmodApplied = false;

export function getFindrPath(): string {
  const { findrPath } = getPreferenceValues<ExtensionPreferences>();

  // User override takes priority
  if (findrPath && existsSync(findrPath)) {
    return findrPath;
  }

  // Downloaded binary (from GitHub Releases)
  const downloaded = join(binDir(), "findr");
  if (existsSync(downloaded)) {
    if (!chmodApplied) {
      try {
        chmodSync(downloaded, 0o755);
      } catch {
        // May already be executable
      }
      chmodApplied = true;
    }
    return downloaded;
  }

  // Fallback: bundled binary (for local development)
  const bundled = join(environment.assetsPath, "findr");
  if (existsSync(bundled)) {
    if (!chmodApplied) {
      try {
        chmodSync(bundled, 0o755);
      } catch {
        // May already be executable
      }
      chmodApplied = true;
    }
    return bundled;
  }

  return downloaded; // Will trigger "binary not found" in search.tsx
}

export function getMaxResults(): number {
  const { maxResults } = getPreferenceValues<ExtensionPreferences>();
  const parsed = parseInt(maxResults, 10);
  return parsed > 0 ? parsed : 30;
}

export function getOpenRouterApiKey(): string {
  const { openrouterApiKey } = getPreferenceValues<ExtensionPreferences>();
  return openrouterApiKey?.trim() || "";
}

export function getScanScope(): string {
  const { scanScope } = getPreferenceValues<ExtensionPreferences>();
  return scanScope || "personal";
}

export function getCustomPaths(): string {
  const { customPaths } = getPreferenceValues<ExtensionPreferences>();
  return customPaths?.trim() || "";
}

export function getScanArgs(): string[] {
  const scope = getScanScope();
  const custom = getCustomPaths();
  const args = ["--preset", scope];
  if (custom) {
    args.push("--paths", custom);
  }
  return args;
}

export function getFindrEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const key = getOpenRouterApiKey();
  if (key) {
    env.OPENROUTER_API_KEY = key;
  }
  return env;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatRelativeDate(isoDate: string): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Yesterday at ${time}`;
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${day} ${month}, ${year} at ${time}`;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "📄",
  doc: "📝",
  docx: "📝",
  xls: "📊",
  xlsx: "📊",
  ppt: "📊",
  pptx: "📊",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  gif: "🖼️",
  svg: "🖼️",
  webp: "🖼️",
  mp3: "🎵",
  mp4: "🎬",
  mov: "🎬",
  zip: "📦",
  tar: "📦",
  gz: "📦",
  md: "📋",
  txt: "📋",
  csv: "📋",
  json: "⚙️",
  yml: "⚙️",
  yaml: "⚙️",
  toml: "⚙️",
  rs: "🦀",
  ts: "💠",
  tsx: "💠",
  js: "💛",
  jsx: "💛",
  py: "🐍",
  go: "🐹",
  html: "🌐",
  css: "🎨",
  sh: "⚡",
};

export function getFileIcon(ext: string | null): string {
  if (!ext) return "📁";
  return FILE_TYPE_ICONS[ext] || "📁";
}

/** Fire-and-forget interaction tracking for frequency-based ranking. */
export function trackInteraction(path: string, action: string): void {
  execFile(getFindrPath(), ["track", path, "--action", action], () => {});
}
