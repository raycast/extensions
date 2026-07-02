import { LocalStorage, environment } from "@raycast/api";
import { execFile as execFileCb } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

import { AGENTS_DIR, allowedDivisions } from "./parser";

const execFile = promisify(execFileCb);

const GITHUB_OWNER = "msitarzewski";
const GITHUB_REPO = "agency-agents";
const GITHUB_BRANCH = "main";
const README_PATH = "README.md";
const SYNC_STATE_KEY = "agents-sync-state";

type GitHubTreeResponse = {
  sha: string;
  truncated: boolean;
  tree: Array<{
    path: string;
    type: "blob" | "tree";
  }>;
};

type SyncState = {
  sha: string;
  syncedAt: string;
};

function getGitHubApiUrl() {
  return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`;
}

function getTarballUrl() {
  return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/tarball/${GITHUB_BRANCH}`;
}

function shouldSyncPath(filePath: string): boolean {
  if (filePath === README_PATH) return true;
  if (!filePath.endsWith(".md")) return false;

  return allowedDivisions.some((division) => filePath === `${division}.md` || filePath.startsWith(`${division}/`));
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": environment.extensionName,
    },
  });

  const remaining = response.headers.get("x-ratelimit-remaining");
  if (remaining !== null && Number(remaining) <= 0) {
    const reset = response.headers.get("x-ratelimit-reset");
    const resetAt = reset ? new Date(Number(reset) * 1000).toUTCString() : "unknown";
    throw new Error(`GitHub rate limit exceeded for ${url}. Reset at ${resetAt}. Consider authenticating.`);
  }

  if (!response.ok) {
    if (response.status === 403 && remaining !== null && Number(remaining) <= 0) {
      const reset = response.headers.get("x-ratelimit-reset");
      const resetAt = reset ? new Date(Number(reset) * 1000).toUTCString() : "unknown";
      throw new Error(`GitHub rate limit exceeded for ${url}. Reset at ${resetAt}. Consider authenticating.`);
    }

    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
}

async function downloadTarball(destPath: string): Promise<void> {
  const response = await fetch(getTarballUrl(), {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": environment.extensionName,
    },
  });

  if (!response.ok) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining !== null && Number(remaining) <= 0) {
      const reset = response.headers.get("x-ratelimit-reset");
      const resetAt = reset ? new Date(Number(reset) * 1000).toUTCString() : "unknown";
      throw new Error(`GitHub rate limit exceeded. Reset at ${resetAt}. Consider authenticating.`);
    }
    throw new Error(`Failed to download tarball (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destPath, buffer);
}

async function readSyncState(): Promise<SyncState | null> {
  const rawValue = await LocalStorage.getItem<string>(SYNC_STATE_KEY);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as SyncState;
  } catch {
    return null;
  }
}

async function writeSyncState(state: SyncState) {
  await LocalStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
}

export async function syncAgentsFromGitHub(options?: { force?: boolean }) {
  const tree = await fetchJson<GitHubTreeResponse>(getGitHubApiUrl());
  if (tree.truncated) {
    throw new Error("GitHub tree response was truncated");
  }

  const previousState = await readSyncState();
  if (!options?.force && previousState?.sha === tree.sha) {
    return { updated: false, syncedAt: previousState.syncedAt, sha: tree.sha };
  }

  const filesToSync = tree.tree.filter((entry) => entry.type === "blob" && shouldSyncPath(entry.path));
  const temporaryDirectory = `${AGENTS_DIR}_tmp_${Date.now()}`;
  const tarballPath = `${temporaryDirectory}.tar.gz`;
  const extractDir = `${temporaryDirectory}_extract`;

  await fs.rm(temporaryDirectory, { recursive: true, force: true });
  await fs.mkdir(temporaryDirectory, { recursive: true });

  try {
    await downloadTarball(tarballPath);
    await fs.mkdir(extractDir, { recursive: true });
    await execFile("tar", ["xzf", tarballPath, "-C", extractDir]);

    const extractedEntries = await fs.readdir(extractDir);
    if (extractedEntries.length === 0) {
      throw new Error("Tarball extraction produced no files");
    }
    const repoRoot = path.join(extractDir, extractedEntries[0]);

    await Promise.all(
      filesToSync.map(async (entry) => {
        const source = path.join(repoRoot, entry.path);
        const destination = path.join(temporaryDirectory, entry.path);
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.copyFile(source, destination);
      }),
    );

    await fs.rm(AGENTS_DIR, { recursive: true, force: true });
    await fs.rename(temporaryDirectory, AGENTS_DIR);
  } catch (error) {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
    throw error;
  } finally {
    await fs.rm(tarballPath, { force: true }).catch(() => {});
    await fs.rm(extractDir, { recursive: true, force: true }).catch(() => {});
  }

  const state: SyncState = {
    sha: tree.sha,
    syncedAt: new Date().toISOString(),
  };

  await writeSyncState(state);

  return {
    updated: true,
    syncedAt: state.syncedAt,
    sha: state.sha,
    fileCount: filesToSync.length,
  };
}

export async function ensureAgentsAvailable() {
  try {
    const entries = await fs.readdir(AGENTS_DIR);
    if (entries.length > 0) return false;
  } catch {
    // Directory doesn't exist yet. We'll sync below.
  }

  await syncAgentsFromGitHub({ force: true });
  return true;
}
