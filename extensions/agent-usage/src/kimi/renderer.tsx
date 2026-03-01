import { List } from "@raycast/api";
import { KimiUsage, KimiError } from "./types";
import type { Accessory } from "../agents/types";
import { formatResetTime } from "../agents/format";
import { formatRemainingPercent, getRemainingPercent } from "./percentage";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
} from "../agents/ui";

export function formatKimiUsageText(usage: KimiUsage | null, error: KimiError | null): string {
  const fallback = formatErrorOrNoData("Kimi", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as KimiUsage;

  let text = `Kimi Usage`;
  text += `\n\nWeekly Limit: ${u.weeklyUsage.remaining}/${u.weeklyUsage.limit}`;
  text += `\nResets In: ${formatResetTime(u.weeklyUsage.resetTime)}`;
  text += `\n\nRate Limit (${u.rateLimit.windowMinutes}m): ${u.rateLimit.remaining}/${u.rateLimit.limit}`;
  text += `\nResets In: ${formatResetTime(u.rateLimit.resetTime)}`;

  return text;
}

export function renderKimiDetail(usage: KimiUsage | null, error: KimiError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as KimiUsage;

  const ratePercent = formatRemainingPercent(u.rateLimit.remaining, u.rateLimit.limit);
  const weeklyPercent = formatRemainingPercent(u.weeklyUsage.remaining, u.weeklyUsage.limit);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title={`Rate Limit (${u.rateLimit.windowMinutes}m)`} text={ratePercent} />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(u.rateLimit.resetTime)} />

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="Weekly Limit" text={weeklyPercent} />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(u.weeklyUsage.resetTime)} />
    </List.Item.Detail.Metadata>
  );
}

export function getKimiAccessory(usage: KimiUsage | null, error: KimiError | null, isLoading: boolean): Accessory {
  if (isLoading) {
    return getLoadingAccessory("Kimi");
  }

  if (error) {
    if (error.type === "not_configured") {
      return { text: "Not Configured", tooltip: error.message };
    }
    if (error.type === "unauthorized") {
      return { text: "Token Expired", tooltip: error.message };
    }
    if (error.type === "network_error") {
      return { text: "Network Error", tooltip: error.message };
    }
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) {
    return getNoDataAccessory();
  }

  const { remaining, limit } = usage.rateLimit;
  const ratePercent = formatRemainingPercent(remaining, limit);

  return {
    icon: generatePieIcon(getRemainingPercent(remaining, limit)),
    text: ratePercent,
    tooltip: `Rate (${usage.rateLimit.windowMinutes}m): ${usage.rateLimit.remaining}/${usage.rateLimit.limit} | Weekly: ${usage.weeklyUsage.remaining}/${usage.weeklyUsage.limit}`,
  };
}
