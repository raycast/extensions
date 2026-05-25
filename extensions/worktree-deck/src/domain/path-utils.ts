import { join, normalize, sep } from "node:path";

/**
 * 末尾のパス区切りを削除する
 */
function trimTrailingSeparators(value: string): string {
  let current = value;
  while (current.length > 1 && current.endsWith(sep)) {
    current = current.slice(0, -1);
  }
  return current;
}

/**
 * パスを正規化して末尾区切りを削る
 */
export function normalizePathValue(value: string): string {
  return trimTrailingSeparators(normalize(value));
}

/**
 * 先頭の ~ を homeDir に展開する
 */
export function expandHomePath(value: string, homeDir: string | null): string {
  if (!value.startsWith("~")) {
    return value;
  }
  if (homeDir === null) {
    return value;
  }
  const normalizedHomeDir = homeDir.trim();
  if (normalizedHomeDir.length === 0) {
    return value;
  }
  const remainder = value.slice(1);
  const trimmed = remainder.startsWith("/") || remainder.startsWith("\\") ? remainder.slice(1) : remainder;
  return join(normalizedHomeDir, trimmed);
}
