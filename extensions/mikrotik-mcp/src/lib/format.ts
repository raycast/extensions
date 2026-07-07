/**
 * Formatters + palettes — copied from `ui/observability/format.ts` so a value
 * reads identically in Raycast and the web dashboard. The hex colors double as
 * Raycast `Color.Raw` values (Raycast accepts raw hex anywhere a color is taken).
 */
import { Color } from "@raycast/api";
import type { Risk } from "./types";

export const ms = (n: number): string =>
  n < 1
    ? "<1ms"
    : n < 1000
      ? `${Math.round(n)}ms`
      : `${(n / 1000).toFixed(2)}s`;

export function bytes(n: number): string {
  const u = ["B", "KiB", "MiB", "GiB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i ? 1 : 0)} ${u[i]}`;
}

export const clock = (ts: number): string =>
  new Date(ts).toLocaleTimeString(undefined, { hour12: false });

export const num = (n: number): string => n.toLocaleString();

export const sval = (v: unknown): string => {
  if (v == null) return "?";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
};

/** Per-metric accent for the device system-health gauges & sparklines. */
export const HEALTH_COLOR = {
  cpu: "#3291ff", // blue
  mem: "#a78bfa", // violet
  disk: "#2dd4bf", // teal
  latency: "#f59e0b", // amber
} as const;

/** Per-risk severity palette (safe → danger), kept in sync with the dashboard. */
export const RISK_COLOR: Record<Risk, string> = {
  READ: "#34d399", // emerald — read-only, safe
  WRITE: "#3291ff", // blue — normal write
  WRITE_IDEMPOTENT: "#2dd4bf", // teal — idempotent write
  DESTRUCTIVE: "#f59e0b", // amber — removes/replaces config
  DANGEROUS: "#ef4444", // red — can lock you out
};

/** Nearest Raycast semantic Color for a risk — used where tag colors read better themed. */
export const RISK_TINT: Record<Risk, Color> = {
  READ: Color.Green,
  WRITE: Color.Blue,
  WRITE_IDEMPOTENT: Color.Blue,
  DESTRUCTIVE: Color.Orange,
  DANGEROUS: Color.Red,
};

/** Compact risk label for tight accessories (WRITE_IDEMPOTENT → WRITE·I). */
export const riskLabel = (r: Risk): string =>
  r === "WRITE_IDEMPOTENT" ? "WRITE·I" : r;

export const WINDOWS: [string, number][] = [
  ["5m", 300_000],
  ["15m", 900_000],
  ["1h", 3_600_000],
  ["6h", 21_600_000],
  ["24h", 86_400_000],
];
export const FEED_CAP = 10_000;

/** Green → amber → red for a 0..100 health percentage (matches topology thresholds). */
export function healthColor(pct: number): Color {
  if (pct >= 85) return Color.Red;
  if (pct >= 60) return Color.Yellow;
  return Color.Green;
}
