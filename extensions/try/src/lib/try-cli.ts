import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { getTryPath } from "./constants";
import { generateDatePrefix } from "./utils";

interface ParsedGitUri {
  user: string;
  repo: string;
  host: string;
}

/**
 * Parse a git URI to extract user, repo, and host
 * Supports:
 * - https://github.com/user/repo
 * - https://github.com/user/repo.git
 * - git@github.com:user/repo
 * - git@github.com:user/repo.git
 */
export function parseGitUri(uri: string): ParsedGitUri | null {
  // Remove .git suffix if present
  const cleanUri = uri.replace(/\.git$/, "");

  // https://github.com/user/repo
  const httpsGithubMatch = cleanUri.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)/);
  if (httpsGithubMatch) {
    return { user: httpsGithubMatch[1], repo: httpsGithubMatch[2], host: "github.com" };
  }

  // git@github.com:user/repo
  const sshGithubMatch = cleanUri.match(/^git@github\.com:([^/]+)\/([^/]+)/);
  if (sshGithubMatch) {
    return { user: sshGithubMatch[1], repo: sshGithubMatch[2], host: "github.com" };
  }

  // https://gitlab.com/user/repo or other git hosts
  const httpsMatch = cleanUri.match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/]+)/);
  if (httpsMatch) {
    return { user: httpsMatch[2], repo: httpsMatch[3], host: httpsMatch[1] };
  }

  // git@host:user/repo
  const sshMatch = cleanUri.match(/^git@([^:]+):([^/]+)\/([^/]+)/);
  if (sshMatch) {
    return { user: sshMatch[2], repo: sshMatch[3], host: sshMatch[1] };
  }

  return null;
}

/**
 * Generate a directory name for cloning
 * Format: YYYY-MM-DD-user-repo or YYYY-MM-DD-customName
 */
export function generateCloneDirectoryName(gitUri: string, customName?: string): string | null {
  if (customName && customName.trim()) {
    const datePrefix = generateDatePrefix();
    return `${datePrefix}-${customName.trim().replace(/\s+/g, "-")}`;
  }

  const parsed = parseGitUri(gitUri);
  if (!parsed) return null;

  const datePrefix = generateDatePrefix();
  return `${datePrefix}-${parsed.user}-${parsed.repo}`;
}

/**
 * Resolve a unique directory name by handling collisions
 * If name ends with digits (e.g., test1), increment the number (test2, test3...)
 * Otherwise, append -2, -3, etc.
 */
function resolveUniqueDirName(dirName: string): string {
  const tryPath = getTryPath();
  const fullPath = join(tryPath, dirName);
  if (!existsSync(fullPath)) {
    return dirName;
  }

  // Check if name ends with digits
  const match = dirName.match(/^(.*?)(\d+)$/);

  if (match) {
    // Name ends with digits, increment the number
    const stem = match[1];
    let num = parseInt(match[2], 10) + 1;

    while (true) {
      const candidate = `${stem}${num}`;
      const candidatePath = join(tryPath, candidate);
      if (!existsSync(candidatePath)) {
        return candidate;
      }
      num++;
    }
  } else {
    // No numeric suffix, use -2, -3 style
    let suffix = 2;
    while (true) {
      const candidate = `${dirName}-${suffix}`;
      const candidatePath = join(tryPath, candidate);
      if (!existsSync(candidatePath)) {
        return candidate;
      }
      suffix++;
    }
  }
}

/**
 * Clone a git repository into a date-prefixed directory
 * @param url - Git repository URL
 * @param name - Optional custom name for the directory
 * @returns The path to the cloned directory
 */
export function tryClone(url: string, name?: string): string {
  const tryPath = getTryPath();
  const dirName = generateCloneDirectoryName(url, name);
  if (!dirName) {
    throw new Error(`Unable to parse git URI: ${url}`);
  }

  const uniqueDirName = resolveUniqueDirName(dirName);
  const fullPath = join(tryPath, uniqueDirName);

  // Ensure parent directory exists
  mkdirSync(tryPath, { recursive: true });

  // Clone the repository
  execSync(`git clone ${JSON.stringify(url)} ${JSON.stringify(fullPath)}`, {
    encoding: "utf8",
    stdio: "pipe",
  });

  return fullPath;
}
