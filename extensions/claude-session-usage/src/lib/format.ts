const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HOUR = 3600_000;
const pad = (n: number) => String(n).padStart(2, "0");

export function formatPercent(pct: number): string {
  return `${Math.round(pct)}%`;
}

export function formatClock(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatReset(resetsAt: Date, now: number): string {
  const ms = resetsAt.getTime() - now;
  if (ms <= 0) return "resetting now";
  if (ms < 24 * HOUR) {
    const totalMin = Math.max(1, Math.ceil(ms / 60_000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `in ${m}m`;
    return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`;
  }
  const day = DAYS[resetsAt.getDay()];
  if (ms < 6 * 24 * HOUR) return `${day} ${formatClock(resetsAt)}`;
  return `${day} ${resetsAt.getDate()} ${MONTHS[resetsAt.getMonth()]} ${formatClock(resetsAt)}`;
}

export function formatAgo(at: number, now: number): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}
