import { environment } from "@raycast/api";
import { createHash } from "crypto";
import { createWriteStream, existsSync } from "fs";
import { spawnSync } from "child_process";
import { chmod, mkdir, mkdtemp, readdir, readFile, rename, rm, rmdir, stat, writeFile } from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import extractZip from "extract-zip";

import { cachedCliDir, cachedCliPath, CLI_BINARY_NAME, CLI_DIR_NAME } from "./paths";
import { resolveExistingCli } from "./resolve-cli";

const RELEASES_API = "https://api.github.com/repos/darrylmorley/whatcable/releases/latest";
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
  const nodeStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
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

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** macOS `comm` is truncated; Raycast commands run as Raycast or node (`ray develop`). */
function isLikelyLockHolderProcess(pid: number): boolean {
  const result = spawnSync("/bin/ps", ["-p", String(pid), "-o", "comm="], {
    encoding: "utf8",
    timeout: 1000,
  });
  const comm = (result.stdout ?? "").trim().toLowerCase();
  if (!comm) {
    return false;
  }
  return comm.includes("raycast") || comm === "node" || comm.startsWith("node");
}

async function lockOwnerAgeMs(ownerPath: string): Promise<number> {
  try {
    const raw = await readFile(ownerPath, "utf8");
    const startedAt = Number(raw.trim().split("\n")[1]);
    if (Number.isFinite(startedAt) && startedAt > 0) {
      return Date.now() - startedAt;
    }
  } catch {
    // Fall through to mtime.
  }
  try {
    const info = await stat(ownerPath);
    return Date.now() - info.mtimeMs;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

async function isLockOwnerStillHolding(lockDir: string, ownerName: string, owner: number): Promise<boolean> {
  if (!isPidAlive(owner) || !isLikelyLockHolderProcess(owner)) {
    return false;
  }
  const ageMs = await lockOwnerAgeMs(path.join(lockDir, ownerName));
  return ageMs < STALE_LOCK_MS;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const LOCK_DIR_NAME = "whatcable-cli.lock";
const LOCK_WAIT_MS = 5 * 60 * 1000;
/** Shorter than LOCK_WAIT_MS so waiters can reap a reused-PID lock before they time out. */
const STALE_LOCK_MS = 2 * 60 * 1000;

function lockDirPath(): string {
  return path.join(environment.supportPath, LOCK_DIR_NAME);
}

function ownerFilePath(pid: number): string {
  return path.join(lockDirPath(), `owner-${pid}`);
}

function isLockHeldError(code: string | undefined): boolean {
  return code === "EEXIST" || code === "ENOTEMPTY" || code === "EISDIR";
}

/**
 * Reap a dead or reused-PID holder's lock without unlinking a replacement.
 * The owner file is named `owner-<pid>`, so we only delete that exact file.
 * `rmdir` then fails if another process already created `owner-<livePid>`.
 */
async function tryReapStaleLock(lockDir: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(lockDir);
  } catch {
    return;
  }

  if (entries.length === 0) {
    try {
      await rmdir(lockDir);
    } catch {
      // Already gone, or a waiter published into it.
    }
    return;
  }

  const owners = entries.filter((entry) => entry.startsWith("owner-"));
  if (owners.length !== 1) {
    return;
  }

  const ownerName = owners[0];
  const owner = Number(ownerName.slice("owner-".length));
  if (!Number.isInteger(owner) || owner <= 0) {
    return;
  }

  if (await isLockOwnerStillHolding(lockDir, ownerName, owner)) {
    return;
  }

  await rm(path.join(lockDir, ownerName), { force: true });
  try {
    await rmdir(lockDir);
  } catch {
    // Another process already placed a live owner file in this directory.
  }
}

async function acquireInstallLock(): Promise<void> {
  const lockDir = lockDirPath();
  await mkdir(environment.supportPath, { recursive: true });
  const deadline = Date.now() + LOCK_WAIT_MS;

  while (true) {
    const stagingDir = await mkdtemp(path.join(environment.supportPath, `${LOCK_DIR_NAME}-`));
    try {
      await writeFile(path.join(stagingDir, `owner-${process.pid}`), `${process.pid}\n${Date.now()}\n`, "utf8");
      // Publish owner file and directory in one rename so waiters never see an empty lock.
      await rename(stagingDir, lockDir);
      return;
    } catch (error) {
      await rm(stagingDir, { recursive: true, force: true });
      const code = (error as NodeJS.ErrnoException).code;
      if (!isLockHeldError(code)) {
        throw error;
      }
      if (Date.now() > deadline) {
        throw new Error("Timed out waiting for WhatCable CLI install lock.");
      }
      await tryReapStaleLock(lockDir);
      await sleep(100);
    }
  }
}

async function releaseInstallLock(): Promise<void> {
  await rm(ownerFilePath(process.pid), { force: true });
  try {
    await rmdir(lockDirPath());
  } catch {
    // Another waiter may already be inside the directory.
  }
}

async function withInstallLock<T>(fn: () => Promise<T>): Promise<T> {
  await acquireInstallLock();
  try {
    return await fn();
  } finally {
    await releaseInstallLock();
  }
}

/** Swap the live cache only after staging is complete, so a crash never leaves an empty target. */
async function replaceCachedCli(stagingDir: string): Promise<void> {
  const targetDir = cachedCliDir();
  const outgoingDir = path.join(environment.supportPath, `.${CLI_DIR_NAME}-outgoing-${process.pid}`);
  await rm(outgoingDir, { recursive: true, force: true });

  if (existsSync(targetDir)) {
    await rename(targetDir, outgoingDir);
  }

  try {
    await rename(stagingDir, targetDir);
  } catch (error) {
    if (existsSync(outgoingDir) && !existsSync(targetDir)) {
      await rename(outgoingDir, targetDir);
    }
    throw error;
  }

  await rm(outgoingDir, { recursive: true, force: true });
}

async function installFromGitHub(): Promise<string> {
  const { release, asset, sha256 } = await fetchLatestCliAsset();
  const supportRoot = environment.supportPath;
  await mkdir(supportRoot, { recursive: true });

  // Stage on the same volume as the live cache so the final rename stays atomic.
  const tempRoot = await mkdtemp(path.join(supportRoot, "whatcable-dl-"));
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

    const stagedBinary = path.join(stagingDir, CLI_BINARY_NAME);
    await chmod(stagedBinary, 0o755);
    await writeFile(path.join(stagingDir, "VERSION"), `${release.tag_name}\n`, "utf8");
    await replaceCachedCli(stagingDir);

    return cachedCliPath();
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

/** Coalesce concurrent installs onto a single in-flight promise (same JS process). */
let installInFlight: Promise<string> | null = null;

/**
 * Resolve a usable WhatCable CLI path, downloading the official release when needed.
 *
 * Force re-download must NOT delete the working cache first — `installFromGitHub`
 * only replaces the cache after the new archive is downloaded, checksum-verified,
 * and staged. A failed download therefore leaves the previous CLI intact.
 */
export async function ensureCli(options?: { forceDownload?: boolean }): Promise<string> {
  const forceDownload = options?.forceDownload ?? false;

  if (!forceDownload) {
    const existing = resolveExistingCli();
    if (existing) {
      return existing;
    }
  }

  if (!installInFlight) {
    installInFlight = withInstallLock(async () => {
      // Another command process may have finished installing while we waited for the lock.
      if (!forceDownload) {
        const existing = resolveExistingCli();
        if (existing) {
          return existing;
        }
      }
      return installFromGitHub();
    }).finally(() => {
      installInFlight = null;
    });
  } else if (forceDownload) {
    await installInFlight;
    return ensureCli({ forceDownload: true });
  }

  return installInFlight;
}
