import { List } from "@raycast/api";
import { ZaiUsage, ZaiError, ZaiLimitEntry } from "./types";
import type { Accessory } from "../agents/types";
import { formatResetTime, getRemainingPercent } from "../agents/format";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui";

const ZAI_ASCII_BAR_WIDTH = 10;

function getRemainingNumericPercent(entry: ZaiLimitEntry | undefined | null): number | undefined {
  if (!entry) return undefined;
  // API percentage field is "percentage used", so remaining = 100 - percentage
  if (entry.percentage != null) {
    return 100 - entry.percentage;
  }
  // Fallback: calculate from remaining/usage if available
  if (entry.remaining != null && entry.usage != null) {
    const total = entry.remaining + entry.usage;
    if (total > 0) {
      return Math.round(getRemainingPercent(entry.remaining, total));
    }
    // If total is 0 but remaining is also 0, we're at 100% (full quota, no usage)
    if (entry.remaining === 0 && entry.usage === 0) {
      return 100;
    }
  }
  return undefined;
}

function formatRemainingPercent(entry: ZaiLimitEntry): string {
  return `${getRemainingNumericPercent(entry) ?? 0}% remaining`;
}

function formatRemainingText(entry: ZaiLimitEntry): string {
  if (entry.remaining != null && entry.usage != null) {
    return `${entry.remaining}/${entry.usage}`;
  }
  if (entry.currentValue != null) {
    return `${entry.currentValue}`;
  }
  return `${100 - entry.percentage}%`;
}

export function formatZaiUsageText(usage: ZaiUsage | null, error: ZaiError | null): string {
  const fallback = formatErrorOrNoData("z.ai", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as ZaiUsage;

  function formatLimitText(label: string, perModelLabel: string, entry: ZaiLimitEntry | null): string {
    if (!entry) return "";

    let limitText = `\n\n${label} (${entry.windowDescription}): ${formatRemainingText(entry)}`;
    limitText += `\n${formatRemainingPercent(entry)}`;
    limitText += `\n${generateAsciiBar(getRemainingNumericPercent(entry) ?? 0, ZAI_ASCII_BAR_WIDTH)}`;
    if (entry.resetTime) {
      limitText += `\nResets In: ${formatResetTime(entry.resetTime)}`;
    }
    if (entry.usageDetails.length > 0) {
      limitText += `\n\n${perModelLabel}:`;
      for (const detail of entry.usageDetails) {
        limitText += `\n  ${detail.modelCode}: ${detail.usage}`;
      }
    }

    return limitText;
  }

  let text = "z.ai Usage";

  if (u.planName) {
    text += `\nPlan: ${u.planName}`;
  }

  text += formatLimitText("Token Limit", "Per-Model Usage", u.tokenLimit);
  text += formatLimitText("Weekly Tokens", "Weekly Per-Model Usage", u.weeklyTokenLimit);
  text += formatLimitText("Time Limit", "Per-Model Usage", u.timeLimit);
  text += formatLimitText("Weekly Time", "Weekly Per-Model Usage", u.weeklyTimeLimit);

  return text;
}

export function renderZaiDetail(usage: ZaiUsage | null, error: ZaiError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as ZaiUsage;

  function renderLimitMetadata(
    label: string,
    entry: ZaiLimitEntry,
    leadingSeparator: boolean | string | null,
  ): React.ReactNode {
    return (
      <>
        {leadingSeparator && <List.Item.Detail.Metadata.Separator />}
        <List.Item.Detail.Metadata.Label
          title={`${label} (${entry.windowDescription})`}
          text={`${generateAsciiBar(getRemainingNumericPercent(entry) ?? 0, ZAI_ASCII_BAR_WIDTH)} ${formatRemainingText(entry)} remaining`}
        />
        {entry.resetTime && (
          <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(entry.resetTime)} />
        )}
        {entry.usageDetails.map((detail) => (
          <List.Item.Detail.Metadata.Label
            key={detail.modelCode}
            title={`  ${detail.modelCode}`}
            text={`${detail.usage}`}
          />
        ))}
      </>
    );
  }

  return (
    <List.Item.Detail.Metadata>
      {u.planName && <List.Item.Detail.Metadata.Label title="Plan" text={u.planName} />}

      {u.tokenLimit && renderLimitMetadata("Token Limit", u.tokenLimit, u.planName)}

      {u.weeklyTokenLimit && renderLimitMetadata("Weekly Token Limit", u.weeklyTokenLimit, true)}

      {u.timeLimit && renderLimitMetadata("Time Limit", u.timeLimit, true)}

      {u.weeklyTimeLimit && renderLimitMetadata("Weekly Time Limit", u.weeklyTimeLimit, true)}
    </List.Item.Detail.Metadata>
  );
}

export function getZaiAccessory(usage: ZaiUsage | null, error: ZaiError | null, isLoading: boolean): Accessory {
  if (isLoading) {
    return getLoadingAccessory("z.ai");
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

  type AccessoryLimit = {
    label: string;
    entry: ZaiLimitEntry | null;
    group: "token" | "time";
  };

  const limits: Array<AccessoryLimit & { percent: number }> = [
    { label: "Tokens", entry: usage.tokenLimit, group: "token" },
    { label: "Weekly Tokens", entry: usage.weeklyTokenLimit, group: "token" },
    { label: "Time", entry: usage.timeLimit, group: "time" },
    { label: "Weekly Time", entry: usage.weeklyTimeLimit, group: "time" },
  ]
    .map((limit) => ({ ...limit, percent: getRemainingNumericPercent(limit.entry) }))
    .filter((limit): limit is AccessoryLimit & { percent: number } => limit.percent !== undefined);

  const parts = limits.map((limit) => `${limit.label}: ${limit.percent}%`);

  // Get bottleneck/minimum of all active percentages
  const activePercents = limits.map((limit) => limit.percent);
  const numericPercent = activePercents.length > 0 ? Math.min(...activePercents) : undefined;

  // The displayed text should also show the bottleneck of tokens (daily vs weekly)
  const tokenPercents = limits.filter((limit) => limit.group === "token").map((limit) => limit.percent);
  const minTokenPercent = tokenPercents.length > 0 ? Math.min(...tokenPercents) : undefined;
  const tokenText = minTokenPercent !== undefined ? `${minTokenPercent}%` : "—";

  return {
    icon: numericPercent !== undefined ? generatePieIcon(numericPercent) : undefined,
    text: tokenText,
    tooltip: parts.join(" | ") || "No limits available",
  };
}
