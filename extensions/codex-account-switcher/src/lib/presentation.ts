import { Color } from "@raycast/api";
import type { CodexAccount, UsageSnapshot, UsageWindow } from "./codex-auth";
import { getCopy } from "./i18n";

export function accountTitle(account: CodexAccount): string {
  return account.alias || account.account_name || account.email;
}

export function accountSubtitle(account: CodexAccount): string | undefined {
  const refreshError = ["http_error", "missing_auth", "error"].includes(account.usage.refresh.status)
    ? sourceLabel(account.usage)
    : null;
  const parts = [
    account.alias ? account.email : null,
    account.account_name,
    updatedAtLabel(account.usage),
    refreshError,
  ].filter(Boolean);
  return [...new Set(parts)].join(" · ") || undefined;
}

export function planLabel(plan: string | null): string | null {
  if (!plan) return null;
  const key = plan.toLowerCase().replace(/[\s_-]/g, "");
  const labels: Record<string, string> = {
    free: "Free",
    go: "Go",
    plus: "Plus",
    prolite: "Pro 5x",
    pro5x: "Pro 5x",
    pro: "Pro 20x",
    pro20x: "Pro 20x",
    business: "Business",
    enterprise: "Enterprise",
    edu: "Edu",
  };
  return labels[key] ?? plan;
}

export function planColor(plan: string | null): Color {
  const key = plan?.toLowerCase().replace(/[\s_-]/g, "");
  if (key === "plus") return Color.Green;
  if (key === "prolite" || key === "pro5x") return Color.Blue;
  if (key === "pro" || key === "pro20x") return Color.Blue;
  return Color.SecondaryText;
}

export function remainingPercent(window: UsageWindow | null): number | null {
  if (!window || !Number.isFinite(window.used_percent)) return null;
  return Math.max(0, Math.min(100, Math.round(100 - window.used_percent)));
}

export function usageWindowName(window: UsageWindow | null, fallback: string): string {
  if (!window) return fallback;
  const copy = getCopy();
  const duration = window.window_minutes;
  if (duration >= 7 * 24 * 60) return copy.week;
  if (duration >= 24 * 60) return copy.days(Math.round(duration / 1440));
  return copy.hours(Math.round(duration / 60));
}

export function percentageLabel(window: UsageWindow | null): string {
  const remaining = remainingPercent(window);
  return remaining === null ? "--" : `${remaining}%`;
}

export function windowLabel(window: UsageWindow | null, fallback: string): string {
  return `${usageWindowName(window, fallback)} ${percentageLabel(window)}`;
}

export function resetTooltip(window: UsageWindow | null, includeDate = true): string | undefined {
  if (!window?.resets_at) return undefined;
  const copy = getCopy();
  const date = new Date(window.resets_at * 1000);
  return copy.resetTime(
    new Intl.DateTimeFormat(copy.locale, {
      ...(includeDate ? { month: "numeric", day: "numeric" } : {}),
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  );
}

export function sourceLabel(usage: UsageSnapshot): string {
  const copy = getCopy();
  const labels = {
    api: copy.sourceRealtime,
    local: copy.sourceLocal,
    cache: copy.sourceCache,
    none: copy.sourceNone,
  } as const;
  if (usage.refresh.status === "http_error" && usage.refresh.http_status)
    return `HTTP ${usage.refresh.http_status}`;
  if (usage.refresh.status === "missing_auth") return copy.missingAuthentication;
  if (usage.refresh.status === "error") return copy.refreshFailed;
  return labels[usage.source];
}

export function updatedAtLabel(usage: UsageSnapshot): string {
  const copy = getCopy();
  if (!usage.updated_at) return copy.updateTimeUnknown;

  const updated = new Date(usage.updated_at * 1000);
  const now = new Date();
  const sameDay =
    updated.getFullYear() === now.getFullYear() &&
    updated.getMonth() === now.getMonth() &&
    updated.getDate() === now.getDate();
  const formatted = new Intl.DateTimeFormat(copy.locale, {
    ...(sameDay ? {} : { month: "numeric", day: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(updated);
  return copy.updatedAt(formatted);
}

export function sourceTooltip(usage: UsageSnapshot): string {
  const copy = getCopy();
  const updated = usage.updated_at
    ? new Intl.DateTimeFormat(copy.locale, {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(usage.updated_at * 1000))
    : copy.unknown;
  return copy.sourceAndUpdateTime(sourceLabel(usage), updated);
}

export function usageSummary(account: CodexAccount): string {
  const copy = getCopy();
  return `${windowLabel(account.usage.primary, copy.fiveHour)} · ${windowLabel(account.usage.secondary, copy.week)} · ${sourceLabel(account.usage)}`;
}
