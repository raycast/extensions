import { environment, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { createHash } from "crypto";
import {
  accessSync,
  constants,
  createReadStream,
  createWriteStream,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { chmod, rename, rm, mkdir } from "fs/promises";
import https from "https";
import { join } from "path";

function execFileAsync(
  file: string,
  args: readonly string[],
  options?: Record<string, unknown>,
): Promise<{ stdout: string; stderr: string }> {
  const { promise, resolve, reject } = Promise.withResolvers<{ stdout: string; stderr: string }>();
  execFile(file, args, options as import("child_process").ExecFileOptions | null | undefined, (err, stdout, stderr) => {
    if (err) reject(err);
    else resolve({ stdout: stdout as string, stderr: stderr as string });
  });
  return promise;
}

const BIN_NAME = process.platform === "win32" ? "glean.exe" : "glean";

/** Persistent metadata cached alongside the binary. */
interface CliInfo {
  path: string;
  version: string;
  source: "preference" | "which" | "download" | "cache";
  /** Per-asset checksums cached so we don't re-fetch on re-download. */
  checksums?: Record<string, string>;
}

interface ReleaseInfo {
  version: string;
  checksums: Record<string, string>;
}

const DOWNLOAD_ERROR_MARKER = ".glean-download-error";

// ── helpers ────────────────────────────────────────────────────────────────

function downloadAssetName(): string {
  const osMap: Record<string, string> = { darwin: "Darwin", linux: "Linux", windows: "Windows" };
  const archMap: Record<string, string> = { x64: "x86_64", arm64: "arm64" };
  const os = osMap[process.platform] ?? "Darwin";
  const arch = archMap[process.arch] ?? "x86_64";
  const ext = process.platform === "win32" ? "zip" : "tar.gz";
  return `glean-cli_${os}_${arch}.${ext}`;
}

function downloadUrl(version: string): string {
  return `https://github.com/gleanwork/glean-cli/releases/download/v${version}/${downloadAssetName()}`;
}

function cliInfoPath(): string {
  return join(environment.supportPath, "cli-info.json");
}

function cachedBinPath(): string {
  return join(environment.supportPath, BIN_NAME);
}

function downloadErrorPath(): string {
  return join(environment.supportPath, DOWNLOAD_ERROR_MARKER);
}

function readCliCache(): CliInfo | null {
  try {
    const raw = readFileSync(cliInfoPath(), "utf-8");
    return JSON.parse(raw) as CliInfo;
  } catch {
    return null;
  }
}

function writeCliCache(info: CliInfo): void {
  try {
    mkdirSync(environment.supportPath, { recursive: true });
    writeFileSync(cliInfoPath(), JSON.stringify(info, null, 2));
  } catch {
    // non-fatal
  }
}

export function checkExecutable(p: string): boolean {
  try {
    accessSync(p, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// ── release info from GitHub ──────────────────────────────────────────────

/**
 * Fetch the latest release version + checksums from GitHub.
 *
 * Only called when we really need to download (rare). The result is cached
 * in cli-info.json so subsequent launches skip the API call entirely.
 */
async function fetchReleaseInfo(): Promise<ReleaseInfo> {
  const res = await fetch("https://api.github.com/repos/gleanwork/glean-cli/releases/latest", {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "raycast-glean-search" },
  });
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);

  const data = (await res.json()) as { tag_name: string };
  const version = data.tag_name.replace(/^v/, "");

  // Fetch checksums.txt from the release
  const checksumUrl = `https://github.com/gleanwork/glean-cli/releases/download/v${version}/checksums.txt`;
  const checksumRes = await fetch(checksumUrl);
  if (!checksumRes.ok) throw new Error(`checksums.txt returned ${checksumRes.status}`);

  const text = await checksumRes.text();
  const checksums: Record<string, string> = {};
  for (const line of text.trim().split("\n")) {
    const [sha, ...rest] = line.trim().split(/\s+/);
    const filename = rest.join(" ");
    if (sha && filename) checksums[filename] = sha;
  }

  return { version, checksums };
}

// ── public API ─────────────────────────────────────────────────────────────

/**
 * Resolve the glean CLI binary path.
 *
 * Strategy (checked in order):
 *  1. User preference (explicit override)
 *  2. Cached path in `supportPath` (fast for subsequent launches)
 *  3. Cached download binary
 *  4. Common Homebrew / system paths
 *  5. `which glean` (PATH lookup)
 *  6. Auto-download from GitHub Releases (with integrity verification)
 *
 * Returns null if all paths fail.
 */
export async function resolveGleanCli(): Promise<string | null> {
  // 1. Cached path — quick check
  const cached = readCliCache();
  if (cached && checkExecutable(cached.path)) {
    return cached.path;
  }

  // 2. Cached download binary
  const cachedBin = cachedBinPath();
  if (checkExecutable(cachedBin)) {
    writeCliCache({ path: cachedBin, version: cached?.version ?? "", source: "cache" });
    return cachedBin;
  }

  // 3. Check common Homebrew / system paths directly
  const commonPaths = ["/opt/homebrew/bin/glean", "/usr/local/bin/glean", "/usr/bin/glean"];
  for (const p of commonPaths) {
    if (checkExecutable(p)) {
      writeCliCache({ path: p, version: "", source: "which" });
      return p;
    }
  }

  // 4. `which glean` — PATH lookup with standard dirs for Raycast's sandbox
  try {
    const whichEnv = {
      ...process.env,
      PATH: ["/usr/local/bin", "/opt/homebrew/bin", "/usr/bin", "/bin", process.env.PATH].filter(Boolean).join(":"),
    };
    const { stdout } = await execFileAsync("which", ["glean"], { env: whichEnv, timeout: 2000 });
    const whichPath = stdout.trim();
    if (whichPath && checkExecutable(whichPath)) {
      writeCliCache({ path: whichPath, version: "", source: "which" });
      return whichPath;
    }
  } catch {
    // not in PATH, continue
  }

  // 5. Auto-download (always attempt, even if previous attempt failed)
  try {
    await downloadGleanCli(cached?.version, cached?.checksums);
    if (checkExecutable(cachedBin)) {
      // downloadGleanCli already wrote cli-info.json with version + checksums
      return cachedBin;
    }
  } catch {
    markDownloadFailed();
  }

  // 6. Last resort — check PATH again in case something changed
  try {
    const whichEnv = {
      ...process.env,
      PATH: ["/usr/local/bin", "/opt/homebrew/bin", "/usr/bin", "/bin", process.env.PATH].filter(Boolean).join(":"),
    };
    const { stdout } = await execFileAsync("which", ["glean"], { env: whichEnv, timeout: 2000 });
    const whichPath = stdout.trim();
    if (whichPath && checkExecutable(whichPath)) {
      writeCliCache({ path: whichPath, version: "", source: "which" });
      return whichPath;
    }
  } catch {
    // nothing found
  }

  return null;
}

/**
 * Reset the download error marker so the next launch attempts a download.
 */
export function clearDownloadError(): void {
  try {
    unlinkSync(downloadErrorPath());
  } catch {
    // no marker to clear
  }
}

// ── download implementation ────────────────────────────────────────────────

function markDownloadFailed(): void {
  try {
    mkdirSync(environment.supportPath, { recursive: true });
    writeFileSync(downloadErrorPath(), `Download failed at ${new Date().toISOString()}`);
  } catch {
    // non-fatal
  }
}

async function downloadGleanCli(cachedVersion?: string, cachedChecksums?: Record<string, string>): Promise<void> {
  // Resolve version + checksums: use cached values if available, else fetch from GitHub
  let version: string;
  let checksums: Record<string, string>;

  if (cachedVersion && cachedChecksums && Object.keys(cachedChecksums).length > 0) {
    version = cachedVersion;
    checksums = cachedChecksums;
  } else {
    const release = await fetchReleaseInfo();
    version = release.version;
    checksums = release.checksums;
    // Cache version + checksums for future re-downloads without API call
    const current = readCliCache();
    writeCliCache({ path: current?.path ?? "", version, source: current?.source ?? "cache", checksums });
  }

  const url = downloadUrl(version);
  const assetName = downloadAssetName();
  const expectedSha256 = checksums[assetName];

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Downloading Glean CLI",
    message: "This may take a moment…",
  });

  const tmpDir = join(environment.supportPath, ".download-tmp");
  await mkdir(tmpDir, { recursive: true });
  const archivePath = join(tmpDir, assetName);

  try {
    // Download
    toast.message = "Downloading…";
    await downloadFile(url, archivePath);

    // Verify SHA-256
    if (expectedSha256) {
      toast.message = "Verifying…";
      const actualSha256 = await fileSha256(archivePath);
      if (actualSha256 !== expectedSha256) {
        throw new Error(`SHA-256 mismatch: expected ${expectedSha256.slice(0, 12)}… got ${actualSha256.slice(0, 12)}…`);
      }
    } else {
      throw new Error(`SHA-256 checksum not found for ${assetName} in release checksums`);
    }

    // Extract
    toast.message = "Extracting…";
    const extractedDir = join(tmpDir, "extracted");
    await mkdir(extractedDir, { recursive: true });

    if (process.platform === "win32") {
      await execFileAsync("powershell", [
        "-Command",
        `Expand-Archive -Path "${archivePath}" -DestinationPath "${extractedDir}" -Force`,
      ]);
    } else {
      await execFileAsync("tar", ["-xzf", archivePath, "-C", extractedDir]);
    }

    // Move binary to final location
    const extractedBin = join(extractedDir, BIN_NAME);
    await chmod(extractedBin, 0o755);
    await rename(extractedBin, cachedBinPath());

    // Update cache with resolved path + version + checksums
    writeCliCache({
      path: cachedBinPath(),
      version,
      source: "download",
      checksums,
    });

    // Cleanup
    await rm(tmpDir, { recursive: true, force: true });
    await toast.hide();
  } catch (error) {
    try {
      await rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to download Glean CLI";
    toast.message = `${message}. Falling back to system PATH.`;
    toast.primaryAction = {
      title: "Open Download Page",
      onAction: () => {
        // handled via Raycast's open utility
      },
    };

    markDownloadFailed();
    throw error;
  }
}

// ── I/O helpers ────────────────────────────────────────────────────────────

function downloadFile(url: string, dest: string, maxRedirects = 10): Promise<void> {
  const { promise, resolve, reject } = withResolvers<void>();

  const file = createWriteStream(dest);

  const handleResponse = (response: import("http").IncomingMessage, remaining: number) => {
    if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
      file.close();
      try {
        unlinkSync(dest);
      } catch {
        // ignore cleanup error
      }
      const location = response.headers.location;
      if (!location || remaining <= 0) {
        reject(new Error(`Redirect failed: ${response.statusCode} -> ${location ?? "no location"}`));
        return;
      }
      downloadFile(new URL(location, url).toString(), dest, remaining - 1)
        .then(resolve)
        .catch(reject);
      return;
    }

    if (response.statusCode !== 200) {
      reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      return;
    }

    response.pipe(file);
    file.on("finish", () => {
      file.close();
      resolve();
    });
  };

  https
    .get(url, (response) => handleResponse(response, maxRedirects))
    .on("error", (err) => {
      file.close();
      try {
        unlinkSync(dest);
      } catch {
        // ignore cleanup error
      }
      reject(err);
    });

  return promise;
}

function fileSha256(filePath: string): Promise<string> {
  const { promise, resolve, reject } = withResolvers<string>();

  const hash = createHash("sha256");
  const stream = createReadStream(filePath);

  stream.on("data", (chunk: string | Buffer) => {
    if (typeof chunk === "string") hash.update(chunk, "utf-8");
    else hash.update(chunk);
  });
  stream.on("end", () => resolve(hash.digest("hex")));
  stream.on("error", reject);

  return promise;
}

/** Polyfill for Promise.withResolvers — available in ES2024+. */
function withResolvers<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
