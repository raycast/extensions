import type { ErrorKind, Prefs, Snapshot, UsageWindow } from "../types";
import { formatAgo, formatClock, formatPercent, formatPlan, formatReset } from "./format";
import { colorFor, ringIcon, type Arc, type IconPair } from "./ring";

export const STALE_MS = 15 * 60_000;

export type Row = { key: string; title: string; subtitle: string; icon: IconPair };

export type View = {
  icon: IconPair;
  title?: string;
  tooltip: string;
  banners: string[];
  rows: Row[];
  extraRows: Row[];
  planLabel: string | null;
  updatedLabel: string;
  dim: boolean;
};

export type Thresholds = { warn: number; crit: number };

export function parseThresholds(prefs: Pick<Prefs, "warnThreshold" | "critThreshold">): Thresholds {
  const num = (s: string | undefined, fallback: number) => {
    const n = Number.parseFloat(String(s ?? "").trim());
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
  };
  const a = num(prefs.warnThreshold, 60);
  const b = num(prefs.critThreshold, 85);
  return { warn: Math.min(a, b), crit: Math.max(a, b) };
}

export function effectiveWindow(w: UsageWindow | null, now: number): UsageWindow | null {
  if (w?.resetsAt && new Date(w.resetsAt).getTime() <= now) {
    return { utilization: 0, resetsAt: null, lockedReason: null };
  }
  return w;
}

export function errorBanner(kind: ErrorKind, backoffUntil: number | null, source: Prefs["credentialsSource"]): string {
  switch (kind) {
    case "not_found":
      return "Not logged in to Claude Code. Run `claude` and /login.";
    case "denied":
      return source === "keychain"
        ? "Keychain access denied. Re-run and click Always Allow."
        : "Can't read ~/.claude/.credentials.json.";
    case "malformed":
      return "Claude Code credentials are unreadable. Run /login again.";
    case "expired":
    case "unauthorized":
      return "Login expired. Open Claude Code once to refresh it.";
    case "rate_limited":
      return backoffUntil ? `Rate limited, retrying at ${formatClock(new Date(backoffUntil))}` : "Rate limited";
    case "server":
    case "network":
      return "Can't reach Anthropic";
    case "schema":
      return "Usage format changed. Extension needs an update.";
  }
}

const shownPct = (w: UsageWindow | null) => (w?.lockedReason ? 100 : (w?.utilization ?? 0));

function arcFor(w: UsageWindow | null, t: Thresholds): Arc {
  const pct = shownPct(w);
  return { pct, color: colorFor(pct, t.warn, t.crit, !!w?.lockedReason) };
}

function windowText(w: UsageWindow | null, now: number): string {
  const pct = formatPercent(shownPct(w));
  return w?.resetsAt ? `${pct} · resets ${formatReset(new Date(w.resetsAt), now)}` : pct;
}

function row(key: string, title: string, w: UsageWindow | null, t: Thresholds, now: number): Row {
  return { key, title, subtitle: windowText(w, now), icon: ringIcon({ inner: arcFor(w, t) }) };
}

export function deriveView(snap: Snapshot, prefs: Prefs, now: number): View {
  const t = parseThresholds(prefs);
  const u = snap.usage;

  const five = u ? effectiveWindow(u.fiveHour, now) : null;
  const week = u ? effectiveWindow(u.sevenDay, now) : null;
  const opus = u ? effectiveWindow(u.sevenDayOpus, now) : null;
  const sonnet = u ? effectiveWindow(u.sevenDaySonnet, now) : null;

  const stale = !!u && now - u.fetchedAt > STALE_MS;
  const dim = !!u && (stale || !!snap.lastError);

  let icon: IconPair;
  if (!u && snap.lastError) icon = ringIcon({ error: true });
  else if (prefs.ringMode === "dual") icon = ringIcon({ outer: arcFor(week, t), inner: arcFor(five, t), dim });
  else icon = ringIcon({ inner: arcFor(prefs.ringMode === "weekly" ? week : five, t), dim });

  const p5 = formatPercent(shownPct(five));
  const p7 = formatPercent(shownPct(week));

  let title: string | undefined;
  if (prefs.showPercentText && u) {
    title = prefs.ringMode === "dual" ? `${p5} · ${p7}` : prefs.ringMode === "weekly" ? p7 : p5;
  }

  const banners: string[] = [];
  if (snap.lastError) {
    banners.push(`⚠ ${errorBanner(snap.lastError.kind, snap.backoffUntil, prefs.credentialsSource)}`);
  }
  if (u && stale) banners.push(`Data from ${formatAgo(u.fetchedAt, now)}`);
  for (const [label, w] of [
    ["Session", five],
    ["Weekly", week],
  ] as const) {
    if (!w?.lockedReason) continue;
    const when = w.resetsAt ? `, resets ${formatReset(new Date(w.resetsAt), now)}` : "";
    banners.push(`⛔ ${label} limit reached: ${w.lockedReason}${when}`);
  }

  const extraRows: Row[] = [];
  if (opus) extraRows.push(row("opus", "Opus Weekly", opus, t, now));
  if (sonnet) extraRows.push(row("sonnet", "Sonnet Weekly", sonnet, t, now));

  const plan = formatPlan(snap.plan?.subscriptionType, snap.plan?.rateLimitTier);

  return {
    icon,
    title,
    tooltip: u ? `Claude: 5h ${p5} · week ${p7}` : "Claude usage: no data yet",
    banners,
    rows: [row("five", "Session (5h)", five, t, now), row("week", "Weekly", week, t, now)],
    extraRows,
    planLabel: plan ? `Plan: ${plan}` : null,
    updatedLabel: u ? `Updated ${formatAgo(u.fetchedAt, now)}` : "Not updated yet",
    dim,
  };
}
