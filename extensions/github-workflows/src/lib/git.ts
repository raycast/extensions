import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";

const execFileAsync = promisify(execFile);

export interface Repo {
  name: string;
  path: string;
  hasWorkflows: boolean;
}

const MAX_SCAN_DEPTH = 3;

/**
 * Scans subfolders of `rootFolder`, up to `MAX_SCAN_DEPTH` levels deep, for
 * git repositories (folders containing a `.git` entry) and reports whether
 * each one has a `.github/workflows` folder with at least one workflow
 * file. Hidden folders (dot-prefixed names) are skipped, and traversal does
 * not descend further into a folder once it has been identified as a repo
 * (avoids picking up nested/vendored repos). Symlinked directories are
 * followed.
 */
export function scanRepos(rootFolder: string): Repo[] {
  if (!rootFolder || !fs.existsSync(rootFolder)) {
    return [];
  }

  const repos: Repo[] = [];
  walkForRepos(rootFolder, 1, repos);

  return repos.sort((a, b) => a.name.localeCompare(b.name));
}

function walkForRepos(dir: string, depth: number, repos: Repo[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const entryPath = path.join(dir, entry.name);
    if (!isDirectoryLike(entry, entryPath)) continue;

    const gitPath = path.join(entryPath, ".git");
    if (fs.existsSync(gitPath)) {
      repos.push({
        name: entry.name,
        path: entryPath,
        hasWorkflows: hasWorkflowsFolder(entryPath),
      });
      continue;
    }

    if (depth < MAX_SCAN_DEPTH) {
      walkForRepos(entryPath, depth + 1, repos);
    }
  }
}

function isDirectoryLike(entry: fs.Dirent, entryPath: string): boolean {
  if (entry.isDirectory()) return true;
  if (!entry.isSymbolicLink()) return false;

  try {
    return fs.statSync(entryPath).isDirectory();
  } catch {
    return false;
  }
}

function hasWorkflowsFolder(repoPath: string): boolean {
  const workflowsPath = path.join(repoPath, ".github", "workflows");
  if (!fs.existsSync(workflowsPath)) return false;

  try {
    const files = fs.readdirSync(workflowsPath);
    return files.some((file) => file.endsWith(".yml") || file.endsWith(".yaml"));
  } catch {
    return false;
  }
}

export async function getCurrentBranch(repoPath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoPath });
    const branch = stdout.trim();
    return branch === "HEAD" ? undefined : branch;
  } catch {
    return undefined;
  }
}

export async function getLocalBranches(repoPath: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["branch", "--list", "--format=%(refname:short)"], {
      cwd: repoPath,
    });
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export interface OwnerRepo {
  owner: string;
  repo: string;
  /** The git host, e.g. `github.com` or a GitHub Enterprise Server hostname. */
  host: string;
}

/**
 * Parses the `origin` remote URL and extracts the owner/repo (and host),
 * supporting SSH (`git@host:owner/repo.git`), `ssh://` and HTTPS
 * (`https://host/owner/repo.git`) forms, for both github.com and GitHub
 * Enterprise Server hosts.
 */
export async function getRemoteOwnerRepo(repoPath: string): Promise<OwnerRepo | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["remote", "get-url", "origin"], { cwd: repoPath });
    return parseOwnerRepo(stdout.trim());
  } catch {
    return undefined;
  }
}

export function parseOwnerRepo(remoteUrl: string): OwnerRepo | undefined {
  // scp-like SSH syntax: [user@]host:owner/repo(.git)?
  const scpMatch = remoteUrl.match(/^(?:[^@/]+@)?([^:/]+):(?!\/\/)([^/]+)\/(.+?)(?:\.git)?\/?$/);
  if (scpMatch) {
    return { host: scpMatch[1], owner: scpMatch[2], repo: scpMatch[3] };
  }

  // ssh://, https://, http://, git:// URL syntax, optionally with a port.
  const urlMatch = remoteUrl.match(
    /^(?:ssh|https?|git):\/\/(?:[^@/]+@)?([^/:]+)(?::\d+)?\/([^/]+)\/(.+?)(?:\.git)?\/?$/,
  );
  if (urlMatch) {
    return { host: urlMatch[1], owner: urlMatch[2], repo: urlMatch[3] };
  }

  return undefined;
}
