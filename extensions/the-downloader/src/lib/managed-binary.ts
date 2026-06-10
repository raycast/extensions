import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { execa } from "execa";
import { isMac, isWindows } from "./binary.js";
import { ROSETTA_RUNTIME_PATH } from "./platform-paths.js";

const RELEASE_API = "https://api.github.com/repos/spotDL/spotify-downloader/releases/latest";
const USER_AGENT = "the-downloader-raycast";

/**
 * Network caps for the GitHub calls, mirroring the hang prevention every child
 * process already gets from `runWithWatchdog`: without them a stalled fetch
 * leaves the Installer's animated toast up forever with no error. The release
 * lookup is a small JSON document; the binary is ~40 MB, so it gets ten
 * minutes — generous for slow links while still bounded.
 */
const RELEASE_LOOKUP_TIMEOUT_MS = 30_000;
const BINARY_DOWNLOAD_TIMEOUT_MS = 600_000;

/** Hosts the spotDL binary may be downloaded from — GitHub and its asset CDN. */
const ALLOWED_DOWNLOAD_HOSTS = new Set(["github.com", "objects.githubusercontent.com"]);

export type ReleaseAsset = { name: string; url: string; digest?: string };
export type SpotdlRelease = { version: string; assets: ReleaseAsset[] };

/**
 * True when the current process is running on Apple Silicon (arm64 macOS).
 * Used to decide whether the x86_64-only spotDL prebuilt binary needs Rosetta
 * to run. Intel Macs return false (binary runs natively); Apple Silicon Macs
 * return true (binary needs Rosetta 2 translation).
 */
export function isAppleSilicon(): boolean {
  return process.platform === "darwin" && process.arch === "arm64";
}

/**
 * Cheap, no-spawn check for Rosetta 2. The Rosetta runtime is installed at
 * `/Library/Apple/usr/share/rosetta/rosetta` from macOS Big Sur onward; the
 * file is absent on a clean Apple Silicon Mac until Rosetta is installed via
 * `softwareupdate --install-rosetta`. Returns false on Intel Macs and Windows
 * — those don't need Rosetta in the first place.
 */
export function isRosettaInstalled(): boolean {
  if (!isAppleSilicon()) return true;
  return fs.existsSync(ROSETTA_RUNTIME_PATH);
}

/** Friendly error thrown when spotDL can't run because Rosetta 2 is missing on Apple Silicon. */
export class RosettaRequiredError extends Error {
  constructor() {
    super(
      "spotDL requires Rosetta 2 on Apple Silicon (the prebuilt binary is x86_64-only). Install it by opening Terminal and running: softwareupdate --install-rosetta --agree-to-license",
    );
    this.name = "RosettaRequiredError";
  }
}

/**
 * Pick the spotDL release asset for a platform. spotDL publishes one binary per
 * platform: `spotdl-<version>-darwin` and `spotdl-<version>-win32.exe`. The bare
 * `spotDL` asset (a source file) is excluded by the `spotdl-` prefix check.
 */
export function resolveSpotdlAsset(platform: NodeJS.Platform, assets: ReleaseAsset[]): ReleaseAsset {
  const suffix = platform === "win32" ? "win32.exe" : platform === "darwin" ? "darwin" : null;
  if (!suffix) {
    throw new Error(`spotDL has no prebuilt binary for platform "${platform}"`);
  }
  const asset = assets.find((a) => a.name.startsWith("spotdl-") && a.name.endsWith(suffix));
  if (!asset) {
    throw new Error(`No spotDL release asset found for platform "${platform}"`);
  }
  return asset;
}

/** Fetch the latest spotDL release metadata from GitHub. */
export async function getLatestRelease(): Promise<SpotdlRelease> {
  const res = await fetch(RELEASE_API, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(RELEASE_LOOKUP_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`GitHub release lookup failed (HTTP ${res.status})`);
  }
  const json = (await res.json()) as {
    tag_name: string;
    assets: { name: string; browser_download_url: string; digest?: string }[];
  };
  return {
    version: json.tag_name.replace(/^v/, ""),
    // GitHub publishes a per-asset `digest` ("sha256:…") on recent releases;
    // keep it so downloadSpotdl can verify the bytes.
    assets: json.assets.map((a) => ({ name: a.name, url: a.browser_download_url, digest: a.digest })),
  };
}

/**
 * Download the spotDL binary for this platform into `supportDir`. Writes to a
 * temp path and renames into place on success, so an interrupted download never
 * leaves a half-written binary at the resolved path. Returns the final path.
 */
export async function downloadSpotdl(supportDir: string): Promise<string> {
  // Fail fast on Apple Silicon without Rosetta 2: the prebuilt binary is
  // x86_64-only and can never run here, so don't download ~40MB just to leave a
  // broken binary on disk. Previously the Rosetta check ran AFTER the binary was
  // renamed into place, so every fs.existsSync(getSpotdlPath()) gate then treated
  // the unrunnable binary as installed — the Installer never reappeared and
  // Spotify downloads failed forever with a raw "Bad CPU type". Checking up front
  // means no bytes are written when the binary can't run.
  if (isAppleSilicon() && !isRosettaInstalled()) {
    throw new RosettaRequiredError();
  }

  const release = await getLatestRelease();
  const asset = resolveSpotdlAsset(process.platform, release.assets);

  // The asset URL comes from the releases API; pin it to GitHub's own hosts so
  // a redirected/rewritten URL can't point the download at an attacker host.
  const host = new URL(asset.url).host;
  if (!ALLOWED_DOWNLOAD_HOSTS.has(host)) {
    throw new Error(`Refusing to download spotDL from an unexpected host: ${host}`);
  }

  // One timeout signal covers the response headers AND the body read — the
  // body is where a wedged connection actually stalls.
  let bytes: Buffer;
  try {
    const res = await fetch(asset.url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(BINARY_DOWNLOAD_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`spotDL download failed (HTTP ${res.status})`);
    }
    bytes = Buffer.from(await res.arrayBuffer());
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("spotDL download timed out. Check your network connection and try again.");
    }
    throw error;
  }

  // Verify the bytes against the SHA-256 GitHub publishes for the asset, when
  // present. This catches a corrupted/truncated download before the binary is
  // made executable. It defends against transmission corruption and a wrong
  // host — NOT against a compromised upstream release (the digest comes from
  // the same API), which is an accepted limit of the auto-download model.
  if (asset.digest?.startsWith("sha256:")) {
    const expected = asset.digest.slice("sha256:".length).toLowerCase();
    const actual = crypto.createHash("sha256").update(bytes).digest("hex");
    if (actual !== expected) {
      throw new Error("spotDL download failed its integrity check (SHA-256 mismatch). Please try again.");
    }
  }

  const finalPath = path.join(supportDir, isWindows ? "spotdl.exe" : "spotdl");
  const tempPath = `${finalPath}.download`;
  fs.mkdirSync(supportDir, { recursive: true });
  try {
    fs.writeFileSync(tempPath, bytes);
    fs.renameSync(tempPath, finalPath);
  } finally {
    // A successful rename consumes tempPath; on any failure this clears the
    // partial `.download` file instead of leaving it in the support dir.
    fs.rmSync(tempPath, { force: true });
  }

  if (!isWindows) {
    fs.chmodSync(finalPath, 0o755);
  }
  if (isMac) {
    // The release binary is unsigned; ad-hoc sign it so it runs on Apple Silicon.
    try {
      await execa("codesign", ["--sign", "-", "--force", finalPath]);
    } catch {
      // codesign unavailable or signing rejected — the binary may still run.
    }
  }
  return finalPath;
}

/** Read the installed spotDL version, e.g. "4.5.0". */
export async function getInstalledVersion(spotdlPath: string): Promise<string> {
  const { stdout } = await execa(spotdlPath, ["--version"]);
  const match = stdout.match(/\d+\.\d+\.\d+/);
  return match ? match[0] : stdout.trim();
}
