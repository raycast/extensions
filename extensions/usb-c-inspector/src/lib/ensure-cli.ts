import { environment, LocalStorage } from "@raycast/api";
import { createHash } from "crypto";
import { createWriteStream, existsSync } from "fs";
import { chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import extractZip from "extract-zip";

import { cachedCliDir, cachedCliPath, CLI_BINARY_NAME, CLI_DIR_NAME } from "./paths";
import { resolveExistingCli } from "./resolve-cli";

const RELEASES_API = "https://api.github.com/repos/darrylmorley/whatcable/releases/latest";
const VERSION_KEY = "whatcableCliVersion";
const USER_AGENT = "raycast-whatcable-extension";

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
  const asset = release.assets.find((item) => /^whatcable-cli-.*\.zip$/i.test(item.name));
  if (!asset) {
    throw new Error("No whatcable-cli zip found in the latest GitHub release.");
  }
  const sha256 = parseSha256Digest(asset.digest);
  if (!sha256) {
    throw new Error("GitHub release asset is missing a sha256 digest; refusing to install.");
  }
  return { release, asset, sha256 };
}

async function installFromGitHub(): Promise<string> {
  const { release, asset, sha256 } = await fetchLatestCliAsset();
  const supportRoot = environment.supportPath;
  await mkdir(supportRoot, { recursive: true });

  const tempRoot = await mkdtemp(path.join(tmpdir(), "whatcable-raycast-"));
  const zipPath = path.join(tempRoot, asset.name);
  const extractRoot = path.join(tempRoot, "extract");
  const stagingDir = path.join(tempRoot, CLI_DIR_NAME);

  try {
    await downloadFile(asset.browser_download_url, zipPath);
    const actualHash = await sha256File(zipPath);
    if (actualHash !== sha256) {
      throw new Error("SHA-256 mismatch for WhatCable CLI download. Installation aborted.");
    }

    await mkdir(extractRoot, { recursive: true });
    await extractZip(zipPath, { dir: extractRoot });

    const extractedBinary = path.join(extractRoot, CLI_DIR_NAME, CLI_BINARY_NAME);
    if (!existsSync(extractedBinary)) {
      throw new Error("Downloaded archive did not contain the whatcable binary.");
    }

    // Keep companion bundles next to the binary (required by the CLI packaging).
    await rename(path.join(extractRoot, CLI_DIR_NAME), stagingDir);

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

/**
 * Resolve a usable WhatCable CLI path, downloading the official release when needed.
 */
export async function ensureCli(options?: { forceDownload?: boolean }): Promise<string> {
  if (!options?.forceDownload) {
    const existing = resolveExistingCli();
    if (existing) {
      return existing;
    }
  } else {
    // Force re-download: remove cached copy so a fresh zip is installed.
    await rm(cachedCliDir(), { recursive: true, force: true });
    await LocalStorage.removeItem(VERSION_KEY);
  }

  return installFromGitHub();
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
