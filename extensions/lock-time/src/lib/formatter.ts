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
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    const parts = [`${days}d`];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 && days < 7) parts.push(`${minutes}m`);
    return parts.join(" ");
  }

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * 将时间戳格式化为 HH:MM 格式的本地时间字符串
 *
 * @param timestamp Unix 时间戳（ms）
 * @returns 格式化后的时间字符串，如 "14:30"
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * 将起止时间戳格式化为时间区间字符串
 *
 * 同一天内显示 "12:57 → 13:48"，跨天时显示 "02/17 08:37 → 02/22 09:53"
 *
 * @param startMs 开始时间戳（Unix ms）
 * @param endMs 结束时间戳（Unix ms）
 * @returns 格式化后的时间区间；若时间戳无效则返回空字符串
 */
export function formatTimeRange(startMs: number, endMs: number): string {
  if (startMs <= 0 || endMs <= 0) return "";

  const startDate = new Date(startMs);
  const endDate = new Date(endMs);

  const sameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (sameDay) {
    return `${formatTime(startMs)} → ${formatTime(endMs)}`;
  }

  return `${formatDate(startMs)} ${formatTime(startMs)} → ${formatDate(endMs)} ${formatTime(endMs)}`;
}

/**
 * 将时间戳格式化为 MM/DD 格式的日期字符串
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${m}/${d}`;
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
