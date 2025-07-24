/**
 * 标准化git URL地址，移除.git后缀
 */
export function normalizeGitUrl(url: string): string {
  if (!url) return "";

  let normalized = url.trim();

  // 移除末尾的.git
  if (normalized.endsWith(".git")) {
    normalized = normalized.slice(0, -4);
  }

  // 移除末尾的斜杠
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  // 标准化协议
  if (normalized.startsWith("git@")) {
    // 将 git@github.com:user/repo 转换为 https://github.com/user/repo
    const match = normalized.match(/git@([^:]+):(.+)/);
    if (match) {
      normalized = `https://${match[1]}/${match[2]}`;
    }
  }

  return normalized.toLowerCase();
}
