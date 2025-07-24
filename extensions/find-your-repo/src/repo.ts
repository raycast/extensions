import { promises as fs } from "node:fs";
import path from "node:path";
import { normalizeGitUrl } from "./utils";
import { matchGitUrl } from "./git";

export interface SearchOptions {
  maxDepth: number;
  excludeDirs: string[];
  currentDir: string;
}

export interface FoundRepo {
  path: string;
  name: string;
  remotes: Array<{ name: string; url: string }>;
}

export const DEFAULT_EXCLUDE_DIRS = [
  "node_modules",
  ".venv",
  "venv",
  "__pycache__",
  ".next",
  "dist",
  "build",
  ".git",
  ".svn",
  ".DS_Store",
  "coverage",
  ".nyc_output",
  "tmp",
  "temp",
];

export const DEFAULT_OPTIONS: SearchOptions = {
  maxDepth: 3,
  excludeDirs: DEFAULT_EXCLUDE_DIRS,
  currentDir: "",
};

/**
 * 检查目录是否应该被排除
 */
function shouldExcludeDir(dirName: string, excludeDirs: string[]): boolean {
  return excludeDirs.includes(dirName);
}

/**
 * 获取目录名称
 */
function getDirName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || parts[parts.length - 2] || "";
}

/**
 * 检查路径是否存在
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 读取目录内容
 */
async function readDirectory(path: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(path, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * 读取git配置文件
 */
async function readGitConfig(repoPath: string): Promise<Array<{ name: string; url: string }>> {
  try {
    const configPath = path.join(repoPath, ".git", "config");

    if (!(await pathExists(configPath))) {
      return [];
    }

    const content = await fs.readFile(configPath, "utf-8");
    const remotes: Array<{ name: string; url: string }> = [];

    // 解析git config文件
    const lines = content.split("\n");
    let currentRemote = "";

    for (const line of lines) {
      const trimmed = line.trim();

      // 检查remote段开始
      const remoteMatch = trimmed.match(/^\[remote "([^"]+)"\]$/);
      if (remoteMatch) {
        currentRemote = remoteMatch[1];
        continue;
      }

      // 检查url行
      if (currentRemote && trimmed.startsWith("url = ")) {
        const url = trimmed.substring(6).trim();
        remotes.push({ name: currentRemote, url });
        currentRemote = "";
      }

      // 如果遇到新的段，重置当前remote
      if (trimmed.startsWith("[") && !trimmed.startsWith("[remote")) {
        currentRemote = "";
      }
    }

    return remotes;
  } catch {
    return [];
  }
}

/**
 * 递归搜索目录中的git仓库
 */
export async function findRepositories(searchPath: string, options: Partial<SearchOptions> = {}): Promise<FoundRepo[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: FoundRepo[] = [];

  async function searchRecursive(currentPath: string, depth: number): Promise<void> {
    if (depth > opts.maxDepth) {
      return;
    }

    // 检查当前目录是否为git仓库
    const gitPath = path.join(currentPath, ".git");

    if (await pathExists(gitPath)) {
      const remotes = await readGitConfig(currentPath);
      const dirName = getDirName(currentPath);

      results.push({
        path: currentPath,
        name: dirName,
        remotes,
      });
    }

    // 继续搜索子目录
    if (depth < opts.maxDepth) {
      const subdirs = await readDirectory(currentPath);

      for (const subdir of subdirs) {
        if (!shouldExcludeDir(subdir, opts.excludeDirs)) {
          const subdirPath = path.join(currentPath, subdir);
          await searchRecursive(subdirPath, depth + 1);
        }
      }
    }
  }

  await searchRecursive(searchPath, 0);
  return results;
}

/**
 * 查找匹配指定git URL的仓库
 */
export async function findMatchingRepositories(
  gitUrl: string,
  searchPath: string,
  options: Partial<SearchOptions> = {},
): Promise<FoundRepo[]> {
  const normalizedInput = normalizeGitUrl(gitUrl);

  const allRepos = await findRepositories(searchPath, options);

  return allRepos.filter((repo) => repo.remotes.some((remote) => matchGitUrl(normalizedInput, remote.url)));
}
