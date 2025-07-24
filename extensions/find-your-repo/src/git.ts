import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeGitUrl } from "./utils";

export interface GitRemote {
  name: string;
  url: string;
}

export interface GitConfig {
  remotes: GitRemote[];
}

/**
 * 检查目录是否为git仓库
 */
export function isGitRepository(dirPath: string): boolean {
  const gitDir = join(dirPath, ".git");
  return existsSync(gitDir);
}

/**
 * 解析git配置文件，获取remote信息
 */
export function parseGitConfig(repoPath: string): GitConfig | null {
  const gitConfigPath = join(repoPath, ".git", "config");

  if (!existsSync(gitConfigPath)) {
    return null;
  }

  try {
    // 使用RayCast API读取文件
    const configContent = readFileSync(gitConfigPath, "utf-8");
    const remotes: GitRemote[] = [];

    // 解析config文件中的remote段
    const remoteRegex = /\[remote "([^"]+)"\]\s*\n(?:\s*[^=]+=.*\n)*?\s*url\s*=\s*(.+?)(?:\n|$)/g;
    let match;

    while ((match = remoteRegex.exec(configContent)) !== null) {
      const name = match[1];
      const url = match[2].trim();
      remotes.push({ name, url });
    }

    return { remotes };
  } catch (error) {
    console.log(error);
    return null;
  }
}

/**
 * 检查输入的git地址是否与remote URL匹配
 */
export function matchGitUrl(inputUrl: string, remoteUrl: string): boolean {
  const normalizedInput = normalizeGitUrl(inputUrl);
  const normalizedRemote = normalizeGitUrl(remoteUrl);

  if (normalizedInput === normalizedRemote) {
    return true;
  }

  // 检查是否为同一个仓库的不同协议版本
  // 例如: https://github.com/user/repo 和 git@github.com:user/repo
  const getRepoIdentifier = (url: string) => {
    const normalized = normalizeGitUrl(url);
    const match = normalized.match(/https?:\/\/([^/]+)\/(.+)/);
    if (match) {
      return `${match[1]}/${match[2]}`;
    }
    return normalized;
  };

  return getRepoIdentifier(inputUrl) === getRepoIdentifier(remoteUrl);
}

/**
 * 获取当前工作目录 - 将由调用方提供
 */
export function getCurrentDirectory(): string {
  // 这个函数将在调用时由RayCast API提供当前目录
  // 暂时返回空字符串，实际使用时会传入目录路径
  return "";
}
