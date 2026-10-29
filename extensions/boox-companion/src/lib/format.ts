export function formatBytes(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return "Unknown";
  if (value === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** index;
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

export function formatDate(value?: Date | number | string): string {
  if (value === undefined) return "Unknown";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function clampPercent(value: unknown): number {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return Math.min(100, Math.max(0, percent));
}
