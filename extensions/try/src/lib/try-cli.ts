import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { getTryPath } from "./constants";
import { generateDatePrefix, resolveUniqueName } from "./utils";

interface ParsedGitUri {
  user: string;
  repo: string;
  host: string;
}

/**
 * Parse a git URI to extract user, repo, and host
 * Supports:
 * - https://host/user/repo
 * - https://host/user/repo.git
 * - git@host:user/repo
 * - git@host:user/repo.git
 */
export function parseGitUri(uri: string): ParsedGitUri | null {
  const cleanUri = uri.replace(/\.git$/, "");

  // HTTPS: https://host/user/repo
  const httpsMatch = cleanUri.match(/^https?:\/\/([^/]+)\/([^/]+)\/([^/]+)/);
  if (httpsMatch) {
    return { host: httpsMatch[1], user: httpsMatch[2], repo: httpsMatch[3] };
  }

  // SSH: git@host:user/repo
  const sshMatch = cleanUri.match(/^git@([^:]+):([^/]+)\/([^/]+)/);
  if (sshMatch) {
    return { host: sshMatch[1], user: sshMatch[2], repo: sshMatch[3] };
  }

  return null;
}

/**
 * Generate a directory name for cloning
 * Format: YYYY-MM-DD-user-repo or YYYY-MM-DD-customName
 */
export function generateCloneDirectoryName(gitUri: string, customName?: string): string | null {
  const datePrefix = generateDatePrefix();

  if (customName?.trim()) {
    return `${datePrefix}-${customName.trim().replace(/\s+/g, "-")}`;
  }

  const parsed = parseGitUri(gitUri);
  return parsed ? `${datePrefix}-${parsed.user}-${parsed.repo}` : null;
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

  const uniqueDirName = resolveUniqueName(dirName, (candidate) => existsSync(join(tryPath, candidate)));
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
