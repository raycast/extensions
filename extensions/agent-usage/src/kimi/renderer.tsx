import { List } from "@raycast/api";

import { formatResetTime } from "../agents/format.ts";
import { toDisplayPercent, type PercentageDisplayMode } from "../agents/percentage-display.ts";
import type { Accessory } from "../agents/types.ts";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  getPercentageDisplayMode,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui.tsx";
import { formatRemainingPercent, formatPercentShort, getRemainingPercentOrNull } from "./percentage.ts";
import type { KimiUsage, KimiError } from "./types.ts";

export function formatKimiUsageText(usage: KimiUsage | null, error: KimiError | null): string {
  const fallback = formatErrorOrNoData("Kimi", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as KimiUsage;
  const mode = getPercentageDisplayMode();

  const remainPct = getRemainingPercentOrNull(u.remaining, u.limit);
  let text = `Kimi Usage`;
  text += `\n\nQuota: ${u.remaining}/${u.limit}`;
  if (remainPct !== null) {
    text += `\n${generateAsciiBar(toDisplayPercent(remainPct, mode))}`;
  }
  text += `\nResets In: ${formatResetTime(u.resetTime)}`;

  if (u.rateLimit) {
    const ratePct = getRemainingPercentOrNull(u.rateLimit.remaining, u.rateLimit.limit);
    text += `\n\nRate Limit (${u.rateLimit.windowMinutes}m): ${u.rateLimit.remaining}/${u.rateLimit.limit}`;
    if (ratePct !== null) {
      text += `\n${generateAsciiBar(toDisplayPercent(ratePct, mode))}`;
    }
    text += `\nResets In: ${formatResetTime(u.rateLimit.resetTime)}`;
  }

  return text;
}

/** "▰▰▰▱▱▱ 58% remaining", or just "--" when the quota is unknown. */
function formatQuotaLabel(remaining: number, limit: number, mode: PercentageDisplayMode): string {
  const label = formatRemainingPercent(remaining, limit, mode);
  const percentRemaining = getRemainingPercentOrNull(remaining, limit);
  if (percentRemaining === null) return label;
  return `${generateAsciiBar(toDisplayPercent(percentRemaining, mode))} ${label}`;
}

export function renderKimiDetail(usage: KimiUsage | null, error: KimiError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as KimiUsage;
  const mode = getPercentageDisplayMode();

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Quota" text={formatQuotaLabel(u.remaining, u.limit, mode)} />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(u.resetTime)} />

      {u.rateLimit && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={`Rate Limit (${u.rateLimit.windowMinutes}m)`}
            text={formatQuotaLabel(u.rateLimit.remaining, u.rateLimit.limit, mode)}
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
  const percentRemaining = getRemainingPercentOrNull(remaining, limit);
  const tooltipParts = [`Quota: ${remaining}/${limit}`];
  if (usage.rateLimit) {
    tooltipParts.push(
      `Rate (${usage.rateLimit.windowMinutes}m): ${usage.rateLimit.remaining}/${usage.rateLimit.limit}`,
    );
  }

  return {
    icon: percentRemaining !== null ? generatePieIcon(percentRemaining) : undefined,
    text: formatPercentShort(remaining, limit, getPercentageDisplayMode()),
    tooltip: tooltipParts.join(" | "),
  };
}
