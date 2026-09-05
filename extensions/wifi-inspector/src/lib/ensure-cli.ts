import { environment, LocalStorage } from "@raycast/api";
import { execFile } from "child_process";
import { createHash } from "crypto";
import { createWriteStream, existsSync } from "fs";
import { chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { promisify } from "util";

import { cachedCliDir, cachedCliPath, CLI_BINARY_NAME, CLI_DIR_NAME } from "./paths";
import { resolveExistingCli } from "./resolve-cli";

const execFileAsync = promisify(execFile);

const RELEASES_API = "https://api.github.com/repos/jaisonerick/macwifi-cli/releases/latest";
const VERSION_KEY = "macwifiCliVersion";
const USER_AGENT = "raycast-wifi-inspector";

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  digest?: string | null;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

function parseSha256Digest(digest: string | null | undefined): string | null {
  if (!digest) {
    return null;
  }
  const match = digest.match(/^sha256:([a-fA-F0-9]{64})$/);
  return match ? match[1].toLowerCase() : null;
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  hash.update(await readFile(filePath));
  return hash.digest("hex");
}

async function downloadFile(url: string, destination: string): Promise<void> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/octet-stream" },
    redirect: "follow",
  });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status}) from GitHub Releases.`);
  }
  const nodeStream = Readable.fromWeb(response.body as import("stream/web").ReadableStream);
  await pipeline(nodeStream, createWriteStream(destination));
}

async function fetchLatestCliAsset(): Promise<{ release: GitHubRelease; asset: GitHubAsset; sha256: string }> {
  const response = await fetch(RELEASES_API, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(`Could not reach GitHub Releases (${response.status}).`);
  }
  const release = (await response.json()) as GitHubRelease;
  const asset = release.assets.find((item) => /darwin_arm64\.tar\.gz$/i.test(item.name));
  if (!asset) {
    throw new Error("No darwin_arm64 macwifi-cli archive found in the latest GitHub release.");
  }
  const sha256 = parseSha256Digest(asset.digest);
  if (!sha256) {
    throw new Error("GitHub release asset is missing a sha256 digest; refusing to install.");
  }
  return { release, asset, sha256 };
}

async function extractTarGz(archivePath: string, destinationDir: string): Promise<void> {
  await mkdir(destinationDir, { recursive: true });
  await execFileAsync("tar", ["-xzf", archivePath, "-C", destinationDir], { timeout: 60_000 });
}

async function installFromGitHub(): Promise<string> {
  const { release, asset, sha256 } = await fetchLatestCliAsset();
  const supportRoot = environment.supportPath;
  await mkdir(supportRoot, { recursive: true });

  const tempRoot = await mkdtemp(path.join(tmpdir(), "macwifi-raycast-"));
  const archivePath = path.join(tempRoot, asset.name);
  const extractRoot = path.join(tempRoot, "extract");
  const stagingDir = path.join(tempRoot, CLI_DIR_NAME);

  try {
    await downloadFile(asset.browser_download_url, archivePath);
    const actualHash = await sha256File(archivePath);
    if (actualHash !== sha256) {
      throw new Error("SHA-256 mismatch for macwifi-cli download. Installation aborted.");
    }

    await extractTarGz(archivePath, extractRoot);

    const extractedBinary = path.join(extractRoot, CLI_BINARY_NAME);
    if (!existsSync(extractedBinary)) {
      throw new Error("Downloaded archive did not contain the macwifi-cli binary.");
    }

    await mkdir(stagingDir, { recursive: true });
    await rename(extractedBinary, path.join(stagingDir, CLI_BINARY_NAME));

    const targetDir = cachedCliDir();
    await rm(targetDir, { recursive: true, force: true });
    await rename(stagingDir, targetDir);

    const cli = cachedCliPath();
    await chmod(cli, 0o755);
    await writeFile(path.join(targetDir, "VERSION"), `${release.tag_name}\n`, "utf8");
    await LocalStorage.setItem(VERSION_KEY, release.tag_name);

    return cli;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

/** Coalesce concurrent installs onto one in-flight promise (shared supportPath target). */
let installInFlight: Promise<string> | null = null;

/**
 * Resolve a usable macwifi-cli path, downloading the official release when needed.
 *
 * Force re-download must NOT delete the working cache first — `installFromGitHub`
 * only replaces the cache after the new archive is downloaded, checksum-verified,
 * and staged. A failed download therefore leaves the previous CLI intact.
 */
export async function ensureCli(options?: { forceDownload?: boolean }): Promise<string> {
  if (!options?.forceDownload) {
    const existing = resolveExistingCli();
    if (existing) {
      return existing;
    }
  }

  if (!installInFlight) {
    installInFlight = installFromGitHub().finally(() => {
      installInFlight = null;
    });
  } else if (options?.forceDownload) {
    await installInFlight;
    return ensureCli({ forceDownload: true });
  }

  return installInFlight;
}

export async function getCachedCliVersion(): Promise<string | undefined> {
  const stored = await LocalStorage.getItem<string>(VERSION_KEY);
  if (stored) {
    return stored;
  }
  const versionFile = path.join(cachedCliDir(), "VERSION");
  if (existsSync(versionFile)) {
    return (await readFile(versionFile, "utf8")).trim();
  }
  return undefined;
}
