import type { ClaudeUsage } from "../claude/types.ts";
import type { CodexRateLimitWindow, CodexUsage } from "../codex/types.ts";
import { generateAsciiBar } from "./detail-format.ts";
import { formatDuration } from "./format.ts";
import { toDisplayPercent } from "./percentage-display.ts";
import type { PercentageDisplayMode } from "./percentage-display.ts";

export interface MenuBarRateWindow {
  percentageRemaining: number;
  resetsIn: string | null;
}

export interface MenuBarRateLimits {
  fiveHour: MenuBarRateWindow | null;
  sevenDay: MenuBarRateWindow | null;
}

export function getClaudeMenuBarRateLimits(usage: ClaudeUsage | null): MenuBarRateLimits {
  return { fiveHour: usage?.fiveHour ?? null, sevenDay: usage?.sevenDay ?? null };
}

function getCodexWindow(window: CodexRateLimitWindow | undefined): MenuBarRateWindow | null {
  if (!window) return null;
  const seconds = window.resetsInSeconds;
  return {
    percentageRemaining: window.percentageRemaining,
    resetsIn: !Number.isFinite(seconds) ? null : seconds <= 0 ? "now" : formatDuration(seconds),
  };
}

export function getCodexMenuBarRateLimits(usage: CodexUsage | null): MenuBarRateLimits {
  return { fiveHour: getCodexWindow(usage?.fiveHourLimit), sevenDay: getCodexWindow(usage?.weeklyLimit) };
}

export function formatMenuBarRateLimit(
  label: "5-Hour" | "7-Day",
  window: MenuBarRateWindow | null,
  mode: PercentageDisplayMode,
): string {
  if (!window || !Number.isFinite(window.percentageRemaining)) return `${label}  Unavailable`;
  const remaining = Math.min(100, Math.max(0, window.percentageRemaining));
  const value = toDisplayPercent(remaining, mode);
  return `${label}  ${generateAsciiBar(value, 12)}  ${value}%  ↻ ${window.resetsIn || "unknown"}`;
}

export function getMenuBarRateLimitContent(
  limits: MenuBarRateLimits,
  mode: PercentageDisplayMode,
  isLoading: boolean,
  errorMessage: string | null,
): { title: string; rows: string[]; status: "ready" | "loading" | "error" | "empty" } {
  const title = `Rate Limits · ${mode === "used" ? "Consumed" : "Remaining"}`;
  if (isLoading) return { title, rows: ["Loading…"], status: "loading" };
  if (errorMessage) return { title, rows: ["Usage unavailable — Open Details"], status: "error" };
  const rows: string[] = [];
  if (limits.fiveHour) rows.push(formatMenuBarRateLimit("5-Hour", limits.fiveHour, mode));
  if (limits.sevenDay) rows.push(formatMenuBarRateLimit("7-Day", limits.sevenDay, mode));
  return {
    title,
    rows: rows.length > 0 ? rows : ["No rate limits reported"],
    status: rows.length > 0 ? "ready" : "empty",
  };
}
