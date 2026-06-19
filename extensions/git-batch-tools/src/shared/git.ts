import { execFile } from "child_process";
import { promisify } from "util";
import { readdir, stat } from "fs/promises";
import { join, basename } from "path";
import { homedir } from "os";
import { getPreferenceValues } from "@raycast/api";
import { ProjectGroup, Repo, RepoStatus } from "./types";

const execFileAsync = promisify(execFile);

function git(repoPath: string, ...args: string[]) {
  return execFileAsync("git", ["-C", repoPath, ...args]);
}

export function resolvePath(p: string): string {
  return p.startsWith("~") ? p.replace("~", homedir()) : p;
}

export function getProjectGroups(): ProjectGroup[] {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.projectPaths
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => {
      const resolved = resolvePath(p);
      return { name: basename(resolved), path: resolved };
    });
}

async function listRepoPaths(groupPath: string): Promise<string[]> {
  try {
    const entries = await readdir(groupPath);
    const checks = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(groupPath, entry);
        try {
          const s = await stat(fullPath);
          if (s.isDirectory()) {
            await stat(join(fullPath, ".git"));
            return fullPath;
          }
        } catch {
          // skip
        }
        return null;
      }),
    );
    return checks.filter((p): p is string => p !== null);
  } catch {
    return [];
  }
}

export async function countRepos(groupPath: string): Promise<number> {
  return (await listRepoPaths(groupPath)).length;
}

export async function getBranch(repoPath: string): Promise<string> {
  try {
    const { stdout } = await git(repoPath, "rev-parse", "--abbrev-ref", "HEAD");
    return stdout.trim();
  } catch {
    return "unknown";
  }
}

export async function scanRepos(groupPath: string): Promise<Repo[]> {
  const repoPaths = await listRepoPaths(groupPath);

  return Promise.all(
    repoPaths.map(async (fullPath) => {
      const branch = await getBranch(fullPath);
      return { name: basename(fullPath), path: fullPath, status: "idle" as RepoStatus, branch };
    }),
  );
}

export async function isDirty(repoPath: string): Promise<boolean> {
  try {
    const { stdout } = await git(repoPath, "status", "--porcelain");
    return stdout.trim().length > 0;
  } catch {
    return true;
  }
}

export async function getAheadBehind(
  repoPath: string,
): Promise<{ ahead: number; behind: number; noUpstream: boolean }> {
  try {
    const { stdout } = await git(repoPath, "rev-list", "--left-right", "--count", "HEAD...@{upstream}");
    const [ahead, behind] = stdout.trim().split(/\s+/).map(Number);
    return { ahead: ahead || 0, behind: behind || 0, noUpstream: false };
  } catch {
    // Check if it's specifically a no-upstream error
    try {
      await git(repoPath, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}");
      return { ahead: 0, behind: 0, noUpstream: false };
    } catch {
      return { ahead: 0, behind: 0, noUpstream: true };
    }
  }
}

export async function pullRepo(repoPath: string): Promise<{ status: RepoStatus; error?: string }> {
  if (await isDirty(repoPath)) {
    return { status: "dirty" };
  }

  try {
    const { stdout, stderr } = await git(repoPath, "pull", "--ff-only");
    const output = stdout + stderr;
    if (output.includes("Already up to date") || output.includes("Already up-to-date")) {
      return { status: "up-to-date" };
    }
    return { status: "updated" };
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    const msg = (err.stderr || err.message || "Unknown error").trim().substring(0, 200);
    return { status: "error", error: msg };
  }
}

export async function parallelPull(
  repos: { path: string; index: number }[],
  maxConcurrency: number,
  onUpdate: (index: number, status: RepoStatus, error?: string) => void,
) {
  let nextIdx = 0;
  let running = 0;

  return new Promise<void>((resolve) => {
    if (repos.length === 0) return resolve();

    function startNext() {
      while (running < maxConcurrency && nextIdx < repos.length) {
        const repo = repos[nextIdx++];
        running++;

        pullRepo(repo.path)
          .then((result) => {
            onUpdate(repo.index, result.status, result.error);
          })
          .catch(() => {
            onUpdate(repo.index, "error", "Unexpected error");
          })
          .finally(() => {
            running--;
            if (nextIdx < repos.length) {
              startNext();
            } else if (running === 0) {
              resolve();
            }
          });
      }
    }

    startNext();
  });
}
