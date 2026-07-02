import { Color, getPreferenceValues } from "@raycast/api";

/**
 * Formatting helpers shared across the Claude Gauge commands.
 *
 * Everything here is defensive: inputs may be `null`/`undefined`/`NaN`
 * because they originate from loosely-typed external data (statusline cache,
 * ccusage CLI). Helpers degrade to a readable placeholder rather than throwing.
 */

const EMPTY = "—";

/** Clamp a number into the inclusive [min, max] range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Format a percentage (0–100) like `42%`. Returns `—` for nullish/NaN. */
export function formatPercent(
  percent: number | null | undefined,
  fractionDigits = 0,
): string {
  if (percent == null || Number.isNaN(percent)) return EMPTY;
  const clamped = clamp(percent, 0, 100);
  return `${clamped.toFixed(fractionDigits)}%`;
}

/**
 * Turn a duration in milliseconds into a compact countdown such as
 * `2h 13m`, `13m`, or `45s`. Negative/zero durations become `now`.
 */
export function countdown(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return EMPTY;
  if (ms <= 0) return "now";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  // Only show seconds when the whole thing is under a minute, to keep it tidy.
  if (parts.length === 0) parts.push(`${seconds}s`);

  return parts.slice(0, 2).join(" ");
}

/** Format a (possibly fractional) token/number count with thousands separators. */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return EMPTY;
  return Math.round(value).toLocaleString("en-US");
}

type CurrencyPrefs = {
  currency?: string;
  usdKrwRate?: string;
};

/**
 * Format a USD amount according to the user's currency preference.
 * For KRW we multiply by the configurable rate and clearly mark it approximate
 * by using the ₩ symbol (callers add an "approx." note in the UI where useful).
 */
export function formatCost(
  usd: number | null | undefined,
  prefs?: CurrencyPrefs,
): string {
  if (usd == null || Number.isNaN(usd)) return EMPTY;

  const resolved = prefs ?? safePreferences();
  const currency = (resolved.currency ?? "USD").toUpperCase();

  if (currency === "KRW") {
    const rate = parsePositiveNumber(resolved.usdKrwRate) ?? 1380;
    const krw = usd * rate;
    return `₩${krw.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }

  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parsePositiveNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function safePreferences(): CurrencyPrefs {
  try {
    return getPreferenceValues<Preferences>();
  } catch {
    return {};
  }
}

/**
 * Map a utilization percentage to a Raycast color using the project thresholds:
 * `<50%` green · `50–75%` yellow · `75–90%` orange · `>90%` red.
 * Unknown values render as secondary text.
 */
export function thresholdColor(percent: number | null | undefined): Color {
  if (percent == null || Number.isNaN(percent)) return Color.SecondaryText;
  if (percent >= 90) return Color.Red;
  if (percent >= 75) return Color.Orange;
  if (percent >= 50) return Color.Yellow;
  return Color.Green;
}

/**
 * Build a fixed-width progress bar for markdown using block glyphs, e.g.
 * `████████░░░░░░░░░░░░ 41%`. Returns a fully-empty bar for nullish input.
 */
export function progressBar(
  percent: number | null | undefined,
  width = 20,
): string {
  const safe =
    percent == null || Number.isNaN(percent) ? 0 : clamp(percent, 0, 100);
  const filled = Math.round((safe / 100) * width);
  const empty = Math.max(0, width - filled);
  return `${"█".repeat(filled)}${"░".repeat(empty)}`;
}

/** A colored emoji dot reflecting the same thresholds, handy for markdown headings. */
export function thresholdDot(percent: number | null | undefined): string {
  if (percent == null || Number.isNaN(percent)) return "⚪️";
  if (percent >= 90) return "🔴";
  if (percent >= 75) return "🟠";
  if (percent >= 50) return "🟡";
  return "🟢";
}

/**
 * Threshold hex colors used by the SVG hero cards. These intentionally mirror
 * the `thresholdColor` Raycast-`Color` semantics (<50 green · 50–75 yellow ·
 * 75–90 orange · ≥90 red) but resolve to fixed hexes that read well on both
 * light and dark appearances. Unknown values return `null` so callers can fall
 * back to a neutral/muted tone.
 */
export function thresholdHex(
  percent: number | null | undefined,
): string | null {
  if (percent == null || Number.isNaN(percent)) return null;
  if (percent >= 90) return "#F85149";
  if (percent >= 75) return "#DB6D28";
  if (percent >= 50) return "#D29922";
  return "#3FB950";
}

/** Short, local clock time such as `2:30 PM`. Returns `—` for nullish dates. */
export function formatClock(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return EMPTY;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Format a reset moment relative to now: just the clock time when it lands
 * today (`2:30 PM`), otherwise a compact date + time (`Jul 5, 2:30 PM`).
 */
export function formatResetMoment(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return EMPTY;
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return formatClock(date);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type ModelFamily = "opus" | "sonnet" | "haiku" | "other";

/** Classify a model id into a Claude family for consistent color-coding. */
export function modelFamily(model: string | null | undefined): ModelFamily {
  const m = (model ?? "").toLowerCase();
  if (m.includes("opus")) return "opus";
  if (m.includes("sonnet")) return "sonnet";
  if (m.includes("haiku")) return "haiku";
  return "other";
}

/** A distinct Raycast color per model family (opus/sonnet/haiku). */
export function modelFamilyColor(model: string | null | undefined): Color {
  switch (modelFamily(model)) {
    case "opus":
      return Color.Purple;
    case "sonnet":
      return Color.Blue;
    case "haiku":
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
}

/** Trim the noisy `claude-` prefix and trailing date/`-latest` from a model id. */
export function shortModelName(model: string | null | undefined): string {
  if (!model) return EMPTY;
  return (
    model
      .replace(/^claude-/, "")
      .replace(/-\d{6,8}$/, "")
      .replace(/-latest$/, "") || model
  );
}
