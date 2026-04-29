import { readdirSync, existsSync, statSync } from "fs";
import { join, basename } from "path";
import { execFileSync, execFile } from "child_process";
import { homedir } from "os";
import { getFolders } from "./storage";

export const EXTENDED_PATH = `${homedir()}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ""}`;

interface GitRepo {
  fullPath: string;
  displayName: string;
}

function scanForGitRepos(baseDir: string, maxDepth: number): GitRepo[] {
  const repos: GitRepo[] = [];
  const baseName = basename(baseDir);

  function walk(dir: string, depth: number, relPath: string) {
    if (depth > maxDepth) return;
    try {
      if (existsSync(join(dir, ".git"))) {
        repos.push({
          fullPath: dir,
          displayName: relPath || baseName,
        });
        return;
      }
      if (depth === maxDepth) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          walk(
            join(dir, entry.name),
            depth + 1,
            relPath ? `${relPath}/${entry.name}` : `${baseName}/${entry.name}`,
          );
        }
      }
    } catch {
      // permission denied etc
    }
  }

  try {
    if (!statSync(baseDir).isDirectory()) return repos;
  } catch {
    return repos;
  }
  walk(baseDir, 0, "");
  return repos;
}

export async function getAllGitRepos(): Promise<GitRepo[]> {
  const folders = await getFolders();
  const seen = new Set<string>();
  const repos: GitRepo[] = [];
  for (const folder of folders) {
    for (const repo of scanForGitRepos(folder, 3)) {
      if (!seen.has(repo.fullPath)) {
        seen.add(repo.fullPath);
        repos.push(repo);
      }
    }
  }
  return repos;
}

export function execGhAsync(args: string[], dir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "gh",
      args,
      {
        cwd: dir,
        encoding: "utf-8",
        timeout: 15000,
        env: { ...process.env, PATH: EXTENDED_PATH },
      },
      (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      },
    );
  });
}

export type MergeMethod = "--merge" | "--rebase" | "--squash";

export const MERGE_METHOD_LABELS: Record<MergeMethod, string> = {
  "--merge": "Merge",
  "--rebase": "Rebase and Merge",
  "--squash": "Squash and Merge",
};

export function extractPrNumber(url: string): string | null {
  const match = url.match(/\/pull\/(\d+)/);
  return match ? match[1] : null;
}

export function dirFromPath(filePath: string): string {
  return filePath.substring(0, filePath.lastIndexOf("/")) || "/";
}

export async function pickFolderDialog(): Promise<string | null> {
  const { execSync } = await import("child_process");
  try {
    const selected = execSync(
      `osascript -e 'POSIX path of (choose folder with prompt "Select a folder to scan")'`,
      { encoding: "utf-8", timeout: 30000 },
    ).trim();
    return selected ? selected.replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

const remoteBaseUrlCache = new Map<
  string,
  { url: string | null; ts: number }
>();
const CACHE_TTL_MS = 60_000;

export function getGitRemoteBaseUrl(dir: string): string | null {
  const now = Date.now();
  const cached = remoteBaseUrlCache.get(dir);
  if (cached && now - cached.ts < CACHE_TTL_MS) return cached.url;

  let result: string | null = null;
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: dir,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    const httpsMatch = url.match(
      /^(https?:\/\/[^/]+\/[^/]+\/[^/]+?)(?:\.git)?$/,
    );
    if (httpsMatch) {
      result = httpsMatch[1];
    } else {
      const sshMatch = url.match(/^(?:git@)?([^:]+):(.+?)(?:\.git)?$/);
      if (sshMatch) result = `https://${sshMatch[1]}/${sshMatch[2]}`;
    }
  } catch {
    // git command failed
  }
  remoteBaseUrlCache.set(dir, { url: result, ts: now });
  return result;
}

export function replaceGitUrlBase(url: string, remoteBaseUrl: string): string {
  if (!remoteBaseUrl) return url;
  // Match https://host/org/repo in the URL (the first 3 path-like segments)
  const urlBaseMatch = url.match(/^(https?:\/\/[^/]+\/[^/]+\/[^/]+)(\/.*)?$/);
  if (!urlBaseMatch) return url;
  const extractedBase = urlBaseMatch[1];
  const rest = urlBaseMatch[2] || "";
  if (extractedBase === remoteBaseUrl) return url;
  return remoteBaseUrl + rest;
}
