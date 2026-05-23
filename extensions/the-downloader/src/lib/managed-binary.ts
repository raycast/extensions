import * as fs from "node:fs";
import * as path from "node:path";
import { execa } from "execa";
import { isMac, isWindows } from "./binary.js";

const RELEASE_API = "https://api.github.com/repos/spotDL/spotify-downloader/releases/latest";
const USER_AGENT = "the-downloader-raycast";

const ROSETTA_RUNTIME_PATH = "/Library/Apple/usr/share/rosetta/rosetta";

export type ReleaseAsset = { name: string; url: string };
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
  });
  if (!res.ok) {
    throw new Error(`GitHub release lookup failed (HTTP ${res.status})`);
  }
  const json = (await res.json()) as {
    tag_name: string;
    assets: { name: string; browser_download_url: string }[];
  };
  return {
    version: json.tag_name.replace(/^v/, ""),
    assets: json.assets.map((a) => ({ name: a.name, url: a.browser_download_url })),
  };
}

/**
 * Download the spotDL binary for this platform into `supportDir`. Writes to a
 * temp path and renames into place on success, so an interrupted download never
 * leaves a half-written binary at the resolved path. Returns the final path.
 */
export async function downloadSpotdl(supportDir: string): Promise<string> {
  const release = await getLatestRelease();
  const asset = resolveSpotdlAsset(process.platform, release.assets);

  const res = await fetch(asset.url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`spotDL download failed (HTTP ${res.status})`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());

  const finalPath = path.join(supportDir, isWindows ? "spotdl.exe" : "spotdl");
  const tempPath = `${finalPath}.download`;
  fs.mkdirSync(supportDir, { recursive: true });
  fs.writeFileSync(tempPath, bytes);
  fs.renameSync(tempPath, finalPath);

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
    if (!isRosettaInstalled()) throw new RosettaRequiredError();
  }
  return finalPath;
}

/** Read the installed spotDL version, e.g. "4.5.0". */
export async function getInstalledVersion(spotdlPath: string): Promise<string> {
  const { stdout } = await execa(spotdlPath, ["--version"]);
  const match = stdout.match(/\d+\.\d+\.\d+/);
  return match ? match[0] : stdout.trim();
}
