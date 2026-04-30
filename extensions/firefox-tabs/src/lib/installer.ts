import { createHash } from "crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { environment } from "@raycast/api";

// -- Constants --

const REPO = "toshi38/raycast-firefox";
const GITHUB_API = `https://api.github.com/repos/${REPO}/releases`;
const INSTALL_DIR = join(homedir(), ".raycast-firefox", "bin");
const SYMLINK_PATH = join(homedir(), ".raycast-firefox", "node");
const REQUIRED_ASSETS = ["host.bundle.js", "run.sh", "SHA256SUMS.txt"];
const NATIVE_HOST_TAG_PREFIX = "native-host@";

// -- Public types --

export interface InstallResult {
  version: string;
  installDir: string;
  symlinkPath: string;
}

// -- Internal helpers --

/**
 * Fetch the latest native-host release from GitHub.
 *
 * We use the /releases endpoint (not /releases/latest) because /releases/latest
 * returns the single most recent release across ALL tags. If the latest release
 * is an extension@ release, it won't have native-host assets. Instead, we fetch
 * the releases list and find the first one tagged with "native-host@".
 */
async function getLatestNativeHostRelease(): Promise<{
  version: string;
  assets: Map<string, string>;
}> {
  const res = await fetch(`${GITHUB_API}?per_page=100`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "raycast-firefox-setup",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (res.status === 403) {
    throw new Error(
      "GitHub rate limit reached. Please try again in a few minutes.",
    );
  }
  if (!res.ok) {
    throw new Error(`Failed to check for updates (HTTP ${res.status})`);
  }

  const releases = (await res.json()) as Array<{
    tag_name: string;
    assets: Array<{ name: string; browser_download_url: string }>;
  }>;

  // Find the first release whose tag starts with "native-host@"
  const release = releases.find((r) =>
    r.tag_name.startsWith(NATIVE_HOST_TAG_PREFIX),
  );
  if (!release) {
    throw new Error(
      "No native host release found. Please check https://github.com/toshi38/raycast-firefox/releases",
    );
  }

  const version = release.tag_name.slice(NATIVE_HOST_TAG_PREFIX.length);
  const assets = new Map<string, string>();
  for (const asset of release.assets) {
    assets.set(asset.name, asset.browser_download_url);
  }

  return { version, assets };
}

/**
 * Download a single asset from a URL. Returns the content as a Buffer.
 * GitHub release asset URLs redirect to a CDN; fetch follows redirects by default.
 */
async function downloadAsset(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`Download failed (HTTP ${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Compute SHA256 hex digest of a buffer. */
function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Parse SHA256SUMS.txt content into a Map of filename -> hash.
 * Format: "<hash>  <filename>" (double-space separator from `shasum -a 256`).
 */
function parseSha256Sums(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.trim().split("\n")) {
    const match = line.match(/^([a-f0-9]{64})\s{1,2}(.+)$/);
    if (match) {
      map.set(match[2].trim(), match[1]);
    }
  }
  return map;
}

/**
 * Verify a downloaded file's SHA256 checksum against the expected value.
 * Throws with a clear message on mismatch or missing entry.
 */
function verifyChecksum(
  buffer: Buffer,
  filename: string,
  checksums: Map<string, string>,
): void {
  const expected = checksums.get(filename);
  if (!expected) {
    throw new Error(
      `No checksum found for ${filename} in SHA256SUMS.txt. The release may be malformed.`,
    );
  }
  const actual = sha256(buffer);
  if (actual !== expected) {
    throw new Error(
      `Checksum mismatch for ${filename}. The download may be corrupted. Please try again.`,
    );
  }
}

/**
 * Atomically install files from a temp directory to the install directory.
 * Uses renameSync when possible (same filesystem), falls back to copyFileSync.
 */
function atomicInstall(
  tempDir: string,
  files: Array<{ name: string; buffer: Buffer; executable?: boolean }>,
  version: string,
): void {
  // Write files to temp dir first
  for (const file of files) {
    const tempPath = join(tempDir, file.name);
    writeFileSync(tempPath, file.buffer);
    if (file.executable) {
      chmodSync(tempPath, 0o755);
    }
  }

  // Create final install dir
  mkdirSync(INSTALL_DIR, { recursive: true });

  // Move files from temp to install dir
  for (const file of files) {
    const src = join(tempDir, file.name);
    const dest = join(INSTALL_DIR, file.name);
    try {
      renameSync(src, dest);
    } catch {
      // Cross-filesystem: fall back to copy + delete
      copyFileSync(src, dest);
      unlinkSync(src);
    }
    // Ensure executable bit survives the move
    if (file.executable) {
      chmodSync(dest, 0o755);
    }
  }

  // Write version.txt LAST as install-complete marker
  writeFileSync(join(INSTALL_DIR, "version.txt"), version, "utf-8");
}

/**
 * Create a Node.js symlink at ~/.raycast-firefox/node pointing to process.execPath.
 * This gives run.sh a deterministic Node.js path (Raycast's bundled Node in production,
 * system Node in dev). Always recreated to handle Raycast Node.js updates.
 */
function createNodeSymlink(): void {
  // Ensure parent directory exists
  mkdirSync(join(homedir(), ".raycast-firefox"), { recursive: true });

  // Remove existing symlink if present
  if (existsSync(SYMLINK_PATH)) {
    try {
      const stat = lstatSync(SYMLINK_PATH);
      if (stat.isSymbolicLink() || stat.isFile()) {
        unlinkSync(SYMLINK_PATH);
      }
    } catch {
      // If lstat fails, try removing anyway
      try {
        unlinkSync(SYMLINK_PATH);
      } catch {
        // Ignore — symlinkSync below will fail if there's a real problem
      }
    }
  }

  symlinkSync(process.execPath, SYMLINK_PATH);
}

// -- Public API --

/**
 * Download, verify, and install the native host from GitHub Releases.
 *
 * The onProgress callback is called with step messages so the caller can
 * update a toast or progress indicator.
 *
 * Flow:
 * 1. Fetch latest native-host release info from GitHub API
 * 2. Download host.bundle.js, run.sh, and SHA256SUMS.txt in parallel
 * 3. Verify SHA256 checksums of host.bundle.js and run.sh
 * 4. Install files atomically (temp dir -> final dir, version.txt last)
 * 5. Create Node.js symlink at ~/.raycast-firefox/node
 */
export async function installNativeHost(
  onProgress: (message: string) => void,
): Promise<InstallResult> {
  // Step 1: Fetch release info
  onProgress("Downloading native host...");

  let releaseInfo: { version: string; assets: Map<string, string> };
  try {
    releaseInfo = await getLatestNativeHostRelease();
  } catch (error) {
    if (error instanceof Error && error.message.includes("fetch failed")) {
      throw new Error("Check your internet connection and try again.");
    }
    throw error;
  }

  // Validate required assets exist in the release
  const missingAssets = REQUIRED_ASSETS.filter(
    (name) => !releaseInfo.assets.has(name),
  );
  if (missingAssets.length > 0) {
    throw new Error(
      `Release is missing required files: ${missingAssets.join(
        ", ",
      )}. Please report this issue.`,
    );
  }

  // Step 2: Download all three assets in parallel
  const [hostBundleBuf, runShBuf, sha256SumsBuf] = await Promise.all([
    downloadAsset(releaseInfo.assets.get("host.bundle.js")!),
    downloadAsset(releaseInfo.assets.get("run.sh")!),
    downloadAsset(releaseInfo.assets.get("SHA256SUMS.txt")!),
  ]);

  // Step 3: Verify checksums
  onProgress("Verifying checksum...");

  const checksums = parseSha256Sums(sha256SumsBuf.toString("utf-8"));
  verifyChecksum(hostBundleBuf, "host.bundle.js", checksums);
  verifyChecksum(runShBuf, "run.sh", checksums);

  // Step 4: Atomic install
  onProgress("Installing files...");

  // Use environment.supportPath for temp dir when available, fall back to OS temp
  const tempBase = environment.supportPath || tmpdir();
  const tempDir = mkdtempSync(join(tempBase, "raycast-firefox-install-"));

  try {
    atomicInstall(
      tempDir,
      [
        { name: "host.bundle.js", buffer: hostBundleBuf },
        { name: "run.sh", buffer: runShBuf, executable: true },
      ],
      releaseInfo.version,
    );
  } finally {
    // Clean up temp dir
    try {
      rmSync(tempDir, { recursive: true });
    } catch {
      // Best-effort cleanup
    }
  }

  // Step 5: Create Node.js symlink
  createNodeSymlink();

  return {
    version: releaseInfo.version,
    installDir: INSTALL_DIR,
    symlinkPath: SYMLINK_PATH,
  };
}
