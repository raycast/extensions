/**
 * Windows FILETIME (64-bit, 100ns units since 1601-01-01, returned as string)
 * and display formatting helpers.
 */

const WINDOWS_EPOCH_DIFF_MS = 116444736000000000n; // 1601-01-01 → 1970-01-01

export function filetimeToDate(ft?: string): Date | null {
  if (!ft) return null;
  try {
    const ms = (BigInt(ft) - WINDOWS_EPOCH_DIFF_MS) / 10000n;
    const d = new Date(Number(ms));
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function formatSize(bytes?: string | number): string {
  if (bytes === undefined || bytes === null || bytes === "") return "—";
  const n = typeof bytes === "number" ? bytes : parseInt(bytes, 10);
  if (isNaN(n)) return "—";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

export function formatDateTime(d?: Date | null): string {
  if (!d) return "—";
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("zh-CN");
}
