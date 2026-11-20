import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, unlinkSync, writeFileSync } from "fs";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { environment } from "@raycast/api";
import { type HostPin, describeDownloadError, verifyPinnedFile } from "./host-version";
import { ensureSymlink, replaceSymlink } from "./node-symlink";
import PINNED_HOST from "./native-host-pin.json";

// -- Constants --

const REPO = "toshi38/raycast-firefox";
const GITHUB_API = `https://api.github.com/repos/${REPO}/releases`;
const INSTALL_DIR = join(homedir(), ".raycast-firefox", "bin");
const SYMLINK_PATH = join(homedir(), ".raycast-firefox", "node");
const REQUIRED_ASSETS = ["host.bundle.js", "run.sh"];
const NATIVE_HOST_TAG_PREFIX = "native-host@";

// -- Public types --

export interface InstallResult {
  version: string;
  installDir: string;
  symlinkPath: string;
}

// -- Internal helpers --

/**
 * Fetch the asset URLs of the pinned native-host release from GitHub.
 */
async function getPinnedRelease(pin: HostPin): Promise<Map<string, string>> {
  const tag = `${NATIVE_HOST_TAG_PREFIX}${pin.version}`;
  const res = await fetch(`${GITHUB_API}/tags/${encodeURIComponent(tag)}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "raycast-firefox-setup",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (res.status === 403) {
    throw new Error("GitHub rate limit reached. Please try again in a few minutes.");
  }
  if (res.status === 404) {
    throw new Error(`Native host release ${tag} not found. Please check https://github.com/${REPO}/releases`);
  }
  if (!res.ok) {
    throw new Error(`Failed to look up the native host release (HTTP ${res.status})`);
  }

  const release = (await res.json()) as { assets: Array<{ name: string; browser_download_url: string }> };
  return new Map(release.assets.map((asset) => [asset.name, asset.browser_download_url]));
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

/**
 * Atomically install files from a temp directory to the install directory.
 * Uses renameSync when possible (same filesystem), falls back to copyFileSync.
 */
function atomicInstall(
  tempDir: string,
  files: Array<{ name: string; buffer: Buffer; executable?: boolean }>,
  version: string
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
  replaceSymlink(process.execPath, SYMLINK_PATH);
}

/**
 * Point ~/.raycast-firefox/node at the Node.js running this extension if it
 * points anywhere else, e.g. after Raycast moved its bundled runtime. Returns
 * whether the link changed.
 */
export function refreshNodeSymlink(): boolean {
  return ensureSymlink(process.execPath, SYMLINK_PATH);
}

// -- Public API --

/**
 * Download, verify, and install the pinned native host release from GitHub
 * Releases.
 *
 * The onProgress callback is called with step messages so the caller can
 * update a toast or progress indicator.
 *
 * Flow:
 * 1. Look up the pinned native-host release on GitHub
 * 2. Download host.bundle.js and run.sh in parallel
 * 3. Verify both against the SHA-256 hashes pinned in native-host-pin.json
 * 4. Create Node.js symlink at ~/.raycast-firefox/node
 * 5. Install files atomically (temp dir -> final dir, version.txt last)
 */
export async function installNativeHost(
  onProgress: (message: string) => void,
  pin: HostPin = PINNED_HOST
): Promise<InstallResult> {
  // Step 1: Fetch release info
  onProgress("Downloading native host...");

  let assets: Map<string, string>;
  try {
    assets = await getPinnedRelease(pin);
  } catch (error) {
    throw new Error(describeDownloadError(error));
  }

  // Validate required assets exist in the release
  const missingAssets = REQUIRED_ASSETS.filter((name) => !assets.has(name));
  if (missingAssets.length > 0) {
    throw new Error(`Release is missing required files: ${missingAssets.join(", ")}. Please report this issue.`);
  }

  // Step 2: Download both assets in parallel
  let hostBundleBuf: Buffer;
  let runShBuf: Buffer;
  try {
    [hostBundleBuf, runShBuf] = await Promise.all([
      downloadAsset(assets.get("host.bundle.js")!),
      downloadAsset(assets.get("run.sh")!),
    ]);
  } catch (error) {
    throw new Error(describeDownloadError(error));
  }

  // Step 3: Verify checksums
  onProgress("Verifying checksum...");

  verifyPinnedFile(hostBundleBuf, "host.bundle.js", pin);
  verifyPinnedFile(runShBuf, "run.sh", pin);

  // Step 4: Create the Node.js symlink before installing the files, so
  // version.txt (written last) only appears once every step has succeeded.
  createNodeSymlink();

  // Step 5: Atomic install
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
      pin.version
    );
  } finally {
    // Clean up temp dir
    try {
      rmSync(tempDir, { recursive: true });
    } catch {
      // Best-effort cleanup
    }
  }

  return {
    version: pin.version,
    installDir: INSTALL_DIR,
    symlinkPath: SYMLINK_PATH,
  };
}
