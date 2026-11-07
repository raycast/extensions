import { Color } from "@raycast/api";
import type { CodexAccount, UsageSnapshot, UsageWindow } from "./codex-auth";

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
  const duration = window.window_minutes;
  if (duration >= 7 * 24 * 60) return "Week";
  if (duration >= 24 * 60) {
    const days = Math.round(duration / 1440);
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  const hours = Math.round(duration / 60);
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
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
  const date = new Date(window.resets_at * 1000);
  return `Resets: ${new Intl.DateTimeFormat("en-US", {
    ...(includeDate ? { month: "numeric", day: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
}

export function sourceLabel(usage: UsageSnapshot): string {
  const labels = {
    api: "Current",
    local: "Local Cache",
    cache: "Cached",
    none: "Unavailable",
  } as const;
  if (usage.refresh.status === "http_error" && usage.refresh.http_status) return `HTTP ${usage.refresh.http_status}`;
  if (usage.refresh.status === "missing_auth") return "Authentication Missing";
  if (usage.refresh.status === "error") return "Refresh Failed";
  return labels[usage.source];
}

export function updatedAtLabel(usage: UsageSnapshot): string {
  if (!usage.updated_at) return "Update Time Unknown";

  const updated = new Date(usage.updated_at * 1000);
  const now = new Date();
  const sameDay =
    updated.getFullYear() === now.getFullYear() &&
    updated.getMonth() === now.getMonth() &&
    updated.getDate() === now.getDate();
  const formatted = new Intl.DateTimeFormat("en-US", {
    ...(sameDay ? {} : { month: "numeric", day: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(updated);
  return `Updated at ${formatted}`;
}

export function sourceTooltip(usage: UsageSnapshot): string {
  const updated = usage.updated_at
    ? new Intl.DateTimeFormat("en-US", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(usage.updated_at * 1000))
    : "Unknown";
  return `Source: ${sourceLabel(usage)} · Updated: ${updated}`;
}

export function usageSummary(account: CodexAccount): string {
  return `${windowLabel(account.usage.primary, "5-hour")} · ${windowLabel(account.usage.secondary, "Week")} · ${sourceLabel(account.usage)}`;
}
