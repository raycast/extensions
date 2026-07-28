/**
 * URL 与格式化相关纯函数。
 */

/** 生成唯一 ID（时间戳 + 随机串），用于历史与收藏条目。 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 把字节数格式化为人类可读的体积。 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** 把毫秒格式化为人类可读的耗时。 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * 安全解析 URL，非法时返回 null。
 * 用 try/catch 包裹 `new URL()`，避免抛异常。
 */
export function parseUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

/**
 * 把 query string 替换到 URL 上，保留 protocol/host/path。
 * 返回新的完整 URL 字符串；解析失败时原样返回。
 */
export function setQueryString(url: string, queryString: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;
  parsed.search = queryString;
  return parsed.toString();
}

/** 从 URL 中提取 query string（不含前导 `?`）。 */
export function getQueryString(url: string): string {
  const parsed = parseUrl(url);
  return parsed?.search.replace(/^\?/, "") ?? "";
}
