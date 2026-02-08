/**
 * 将毫秒数格式化为人类可读的时间字符串
 *
 * 规则：
 * - >= 1h: "1h 36m"
 * - >= 1m: "42m 18s"
 * - < 1m: "18s"
 * - 0: "0s"
 *
 * @param ms 毫秒数
 * @returns 格式化后的时间字符串
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    // 超过 1 小时：显示 "Xh Ym"
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    // 超过 1 分钟：显示 "Xm Ys"
    return seconds > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${minutes}m`;
  }

  // 不足 1 分钟：显示 "Xs"
  return `${seconds}s`;
}

/**
 * 获取当前日期字符串（YYYY-MM-DD 格式）
 *
 * @returns 当前日期字符串
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
