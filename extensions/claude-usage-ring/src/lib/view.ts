import type { UsageState, UsageWindow } from "../types";
import { formatAgo, formatPercent, formatReset } from "./format";
import { AMBER, colorFor, RED, ringIcon, type Arc, type IconPair } from "./ring";

export type Level = "normal" | "warning" | "critical";

export type Row = {
  key: string;
  title: string;
  subtitle: string;
  percent: string;
  reset: string | null;
  level: Level;
  icon: IconPair;
};

export type Banner = { kind: "error" | "setup" | "limit"; text: string };

export type View = {
  icon: IconPair;
  title?: string;
  tooltip: string;
  banners: Banner[];
  rows: Row[];
  updatedLabel: string;
  summary: string;
};

export type ViewPrefs = Pick<Preferences, "ringMode" | "showPercentText" | "warnThreshold" | "critThreshold">;

export type Thresholds = { warn: number; crit: number };

export const NOT_CONNECTED = "Not connected. Run Connect Claude Code to start.";
export const WAITING = "Waiting for Claude Code. Send a message in Claude Code (Pro or Max plan).";

export function parseThresholds(prefs: Pick<ViewPrefs, "warnThreshold" | "critThreshold">): Thresholds {
  const num = (s: string | undefined, fallback: number) => {
    const n = Number.parseFloat(String(s ?? "").trim());
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
  };
  const a = num(prefs.warnThreshold, 60);
  const b = num(prefs.critThreshold, 85);
  return { warn: Math.min(a, b), crit: Math.max(a, b) };
}

export function effectiveWindow(w: UsageWindow | null, now: number): UsageWindow | null {
  if (w?.resetsAt && new Date(w.resetsAt).getTime() <= now) return { utilization: 0, resetsAt: null };
  return w;
}

const pctOf = (w: UsageWindow | null) => w?.utilization ?? 0;

function arcFor(w: UsageWindow | null, t: Thresholds): Arc {
  const pct = pctOf(w);
  return { pct, color: colorFor(pct, t.warn, t.crit) };
}

function row(key: string, title: string, w: UsageWindow | null, t: Thresholds, now: number): Row {
  const arc = arcFor(w, t);
  const percent = formatPercent(arc.pct);
  const reset = w?.resetsAt ? `resets ${formatReset(new Date(w.resetsAt), now)}` : null;
  return {
    key,
    title,
    subtitle: reset ? `${percent} · ${reset}` : percent,
    percent,
    reset,
    level: arc.color === RED ? "critical" : arc.color === AMBER ? "warning" : "normal",
    icon: ringIcon({ inner: arc }),
  };
}

export function deriveView(state: UsageState, prefs: ViewPrefs, now: number, error?: Error): View {
  const t = parseThresholds(prefs);
  const u = state.usage;
  const five = u ? effectiveWindow(u.fiveHour, now) : null;
  const week = u ? effectiveWindow(u.sevenDay, now) : null;

  let icon: IconPair;
  if (!u) icon = ringIcon({ error: true });
  else if (prefs.ringMode === "dual") icon = ringIcon({ outer: arcFor(week, t), inner: arcFor(five, t) });
  else icon = ringIcon({ inner: arcFor(prefs.ringMode === "weekly" ? week : five, t) });

  const p5 = formatPercent(pctOf(five));
  const p7 = formatPercent(pctOf(week));

  let title: string | undefined;
  if (prefs.showPercentText && u) {
    title = prefs.ringMode === "dual" ? `${p5} · ${p7}` : prefs.ringMode === "weekly" ? p7 : p5;
  }

  const banners: Banner[] = [];
  if (error) banners.push({ kind: "error", text: error.message });
  if (!state.connected) banners.push({ kind: "setup", text: NOT_CONNECTED });
  else if (!u && !error) banners.push({ kind: "setup", text: WAITING });
  for (const [label, w] of [
    ["Session", five],
    ["Weekly", week],
  ] as const) {
    if (!w || w.utilization < 100) continue;
    const when = w.resetsAt ? `, resets ${formatReset(new Date(w.resetsAt), now)}` : "";
    banners.push({ kind: "limit", text: `${label} limit reached${when}` });
  }

  const rows = [row("five", "Session (5h)", five, t, now), row("week", "Weekly", week, t, now)];

  return {
    icon,
    title,
    tooltip: u ? `Claude: 5h ${p5} · week ${p7}` : "Claude usage: no data yet",
    banners,
    rows,
    updatedLabel: u ? `Updated ${formatAgo(u.fetchedAt, now)} from Claude Code` : "No data yet",
    summary: u ? rows.map((r) => `${r.title}: ${r.subtitle}`).join("\n") : "",
  };
}
