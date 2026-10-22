import { hasExtraCost } from "../analysis/visible";

export function formatWatts(w?: number, digits = 1): string {
  return w === undefined ? "– W" : `${w.toFixed(digits)} W`;
}

export function formatDuration(sec: number): string {
  const minutes = Math.floor(sec / 60);
  if (minutes < 1) return "<1m";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

export function formatRate(pctPerHour?: number): string {
  if (pctPerHour === undefined) return "—";
  const rounded = Math.round(pctPerHour);
  return rounded >= 0 ? `${rounded}% per hour` : `gaining ${-rounded}% per hour`;
}

/**
 * CPU with its unit. Energy impact mostly equals CPU, so it is shown only when it clearly exceeds it
 * (at least 1.5× and 10 points): then the process costs battery beyond CPU, through GPU or wakeups.
 */
export function formatUsage(p: { energy: number; cpu: number }): string {
  const cpu = `${Math.round(p.cpu)}% CPU`;
  return hasExtraCost(p) ? `${cpu} · +GPU/wakeups` : cpu;
}

export function formatPercent(p?: number): string {
  return p === undefined ? "—" : `${Math.round(p)}%`;
}

export const ENERGY_TOOLTIP =
  "Sorted by energy impact, Activity Monitor's battery-cost score. +GPU/wakeups: it costs battery beyond its CPU use.";

const WEBKIT_SERVICES: Record<string, string> = {
  "com.apple.WebKit.WebContent": "Web Content (WebKit)",
  "com.apple.WebKit.GPU": "GPU (WebKit)",
  "com.apple.WebKit.Networking": "Networking (WebKit)",
};

/** A readable name for display; WebKit's XPC services otherwise show as reverse-DNS identifiers. */
export function displayName(command: string): string {
  return WEBKIT_SERVICES[command] ?? command;
}

/** Local time of day, "13:05:09": unlike "Ns ago" it stays correct while the view is not redrawn. */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
}
