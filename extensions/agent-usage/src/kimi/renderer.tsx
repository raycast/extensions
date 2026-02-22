import { List } from "@raycast/api";
import { KimiUsage, KimiError } from "./types";
import { formatResetTime } from "./fetcher";
import { formatRemainingPercent } from "./percentage";
import { renderErrorDetail, renderNoDataDetail, getLoadingAccessory, getNoDataAccessory } from "../agents/ui";

export function formatKimiUsageText(usage: KimiUsage | null, error: KimiError | null): string {
  if (error) {
    return `Kimi Usage\nStatus: Error\nType: ${error.type}\nMessage: ${error.message}`;
  }
  if (!usage) {
    return "Kimi Usage\nStatus: No data available";
  }

  let text = `Kimi Usage`;
  text += `\n\nWeekly Limit: ${usage.weeklyUsage.remaining}/${usage.weeklyUsage.limit}`;
  text += `\nResets In: ${formatResetTime(usage.weeklyUsage.resetTime)}`;
  text += `\n\nRate Limit (${usage.rateLimit.windowMinutes}m): ${usage.rateLimit.remaining}/${usage.rateLimit.limit}`;
  text += `\nResets In: ${formatResetTime(usage.rateLimit.resetTime)}`;

  return text;
}

export function renderKimiDetail(usage: KimiUsage | null, error: KimiError | null): React.ReactNode {
  if (error) {
    return renderErrorDetail(error);
  }

  if (!usage) {
    return renderNoDataDetail();
  }

  const ratePercent = formatRemainingPercent(usage.rateLimit.remaining, usage.rateLimit.limit);
  const weeklyPercent = formatRemainingPercent(usage.weeklyUsage.remaining, usage.weeklyUsage.limit);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title={`Rate Limit (${usage.rateLimit.windowMinutes}m)`} text={ratePercent} />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(usage.rateLimit.resetTime)} />

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="Weekly Limit" text={weeklyPercent} />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(usage.weeklyUsage.resetTime)} />
    </List.Item.Detail.Metadata>
  );
}

export function getKimiAccessory(
  usage: KimiUsage | null,
  error: KimiError | null,
  isLoading: boolean,
): { text: string; tooltip?: string } {
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

  const ratePercent = formatRemainingPercent(usage.rateLimit.remaining, usage.rateLimit.limit);

  return {
    text: ratePercent,
    tooltip: `Rate (${usage.rateLimit.windowMinutes}m): ${usage.rateLimit.remaining}/${usage.rateLimit.limit} | Weekly: ${usage.weeklyUsage.remaining}/${usage.weeklyUsage.limit}`,
  };
}
