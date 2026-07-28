/** Name of the immediate parent folder of a path. "/" for top-level paths. */
export function parentFolderName(path: string): string {
  const slash = path.lastIndexOf("/");
  if (slash <= 0) return "/";
  const dir = path.slice(0, slash);
  const prev = dir.lastIndexOf("/");
  const name = prev >= 0 ? dir.slice(prev + 1) : dir;
  return name || "/";
}

/** Compact relative time like "just now", "5m ago", "3d ago", "2mo ago". */
export function formatRelativeTime(ms: number, nowMs: number): string {
  const diff = nowMs - ms;
  if (diff < 0) return "soon";
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${Math.max(1, min)}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.floor(day / 7)}w ago`;
  if (day < 365) return `${Math.floor(day / 30)}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

/** Bytes to a short human size, e.g. "4.2 MB". null/undefined -> "". */
export function formatSize(bytes: number | null): string {
  if (bytes == null || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  const value = i === 0 || n >= 100 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, "");
  return `${value} ${units[i]}`;
}
