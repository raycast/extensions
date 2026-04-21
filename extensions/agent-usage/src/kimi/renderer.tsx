import { List } from "@raycast/api";
import { KimiUsage, KimiError } from "./types";
import type { Accessory } from "../agents/types";
import { formatResetTime } from "../agents/format";
import { formatRemainingPercent, formatPercentShort, getRemainingPercent } from "./percentage";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui";

export function formatKimiUsageText(usage: KimiUsage | null, error: KimiError | null): string {
  const fallback = formatErrorOrNoData("Kimi", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as KimiUsage;

  const remainPct = u.limit > 0 ? (u.remaining / u.limit) * 100 : 0;
  let text = `Kimi Usage`;
  text += `\n\nQuota: ${u.remaining}/${u.limit}`;
  text += `\n${generateAsciiBar(remainPct)}`;
  text += `\nResets In: ${formatResetTime(u.resetTime)}`;

  if (u.rateLimit) {
    const ratePct = u.rateLimit.limit > 0 ? (u.rateLimit.remaining / u.rateLimit.limit) * 100 : 0;
    text += `\n\nRate Limit (${u.rateLimit.windowMinutes}m): ${u.rateLimit.remaining}/${u.rateLimit.limit}`;
    text += `\n${generateAsciiBar(ratePct)}`;
    text += `\nResets In: ${formatResetTime(u.rateLimit.resetTime)}`;
  }

  return text;
}

export function renderKimiDetail(usage: KimiUsage | null, error: KimiError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as KimiUsage;

  const remainPercent = formatRemainingPercent(u.remaining, u.limit);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Quota"
        text={`${generateAsciiBar(getRemainingPercent(u.remaining, u.limit))} ${remainPercent}`}
      />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(u.resetTime)} />

      {u.rateLimit && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={`Rate Limit (${u.rateLimit.windowMinutes}m)`}
            text={`${generateAsciiBar(getRemainingPercent(u.rateLimit.remaining, u.rateLimit.limit))} ${formatRemainingPercent(u.rateLimit.remaining, u.rateLimit.limit)}`}
          />
          <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(u.rateLimit.resetTime)} />
        </>
      )}
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

  const { remaining, limit } = usage;
  const tooltipParts = [`Quota: ${remaining}/${limit}`];
  if (usage.rateLimit) {
    tooltipParts.push(
      `Rate (${usage.rateLimit.windowMinutes}m): ${usage.rateLimit.remaining}/${usage.rateLimit.limit}`,
    );
  }

  return {
    icon: generatePieIcon(getRemainingPercent(remaining, limit)),
    text: formatPercentShort(remaining, limit),
    tooltip: tooltipParts.join(" | "),
  };
}
