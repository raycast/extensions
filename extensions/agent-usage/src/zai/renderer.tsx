import { List } from "@raycast/api";
import { ZaiUsage, ZaiError, ZaiLimitEntry } from "./types";
import type { Accessory } from "../agents/types";
import { formatResetTime } from "../agents/format";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
} from "../agents/ui";

function getRemainingNumericPercent(entry: ZaiLimitEntry | undefined | null): number | undefined {
  if (!entry) return undefined;
  if (entry.remaining != null && entry.usage != null && entry.usage > 0) {
    return Math.round((entry.remaining / entry.usage) * 100);
  }
  return 100 - entry.percentage;
}

function formatRemainingPercent(entry: ZaiLimitEntry): string {
  return `${getRemainingNumericPercent(entry) ?? 0}%`;
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

  let text = "z.ai Usage";

  if (u.planName) {
    text += `\nPlan: ${u.planName}`;
  }

  if (u.tokenLimit) {
    text += `\n\nToken Limit (${u.tokenLimit.windowDescription}): ${formatRemainingText(u.tokenLimit)}`;
    text += `\n${formatRemainingPercent(u.tokenLimit)}`;
    if (u.tokenLimit.resetTime) {
      text += `\nResets In: ${formatResetTime(u.tokenLimit.resetTime)}`;
    }
    if (u.tokenLimit.usageDetails.length > 0) {
      text += "\n\nPer-Model Usage:";
      for (const detail of u.tokenLimit.usageDetails) {
        text += `\n  ${detail.modelCode}: ${detail.usage}`;
      }
    }
  }

  if (u.timeLimit) {
    text += `\n\nTime Limit (${u.timeLimit.windowDescription}): ${formatRemainingText(u.timeLimit)}`;
    text += `\n${formatRemainingPercent(u.timeLimit)}`;
    if (u.timeLimit.resetTime) {
      text += `\nResets In: ${formatResetTime(u.timeLimit.resetTime)}`;
    }
    if (u.timeLimit.usageDetails.length > 0) {
      text += "\n\nPer-Model Usage:";
      for (const detail of u.timeLimit.usageDetails) {
        text += `\n  ${detail.modelCode}: ${detail.usage}`;
      }
    }
  }

  return text;
}

export function renderZaiDetail(usage: ZaiUsage | null, error: ZaiError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as ZaiUsage;

  return (
    <List.Item.Detail.Metadata>
      {u.planName && <List.Item.Detail.Metadata.Label title="Plan" text={u.planName} />}

      {u.tokenLimit && (
        <>
          {u.planName && <List.Item.Detail.Metadata.Separator />}
          <List.Item.Detail.Metadata.Label
            title={`Token Limit (${u.tokenLimit.windowDescription})`}
            text={formatRemainingPercent(u.tokenLimit)}
          />
          <List.Item.Detail.Metadata.Label title="Remaining" text={formatRemainingText(u.tokenLimit)} />
          {u.tokenLimit.resetTime && (
            <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(u.tokenLimit.resetTime)} />
          )}
          {u.tokenLimit.usageDetails.map((detail) => (
            <List.Item.Detail.Metadata.Label
              key={detail.modelCode}
              title={`  ${detail.modelCode}`}
              text={`${detail.usage}`}
            />
          ))}
        </>
      )}

      {u.timeLimit && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={`Time Limit (${u.timeLimit.windowDescription})`}
            text={formatRemainingPercent(u.timeLimit)}
          />
          <List.Item.Detail.Metadata.Label title="Remaining" text={formatRemainingText(u.timeLimit)} />
          {u.timeLimit.resetTime && (
            <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(u.timeLimit.resetTime)} />
          )}
          {u.timeLimit.usageDetails.map((detail) => (
            <List.Item.Detail.Metadata.Label
              key={detail.modelCode}
              title={`  ${detail.modelCode}`}
              text={`${detail.usage}`}
            />
          ))}
        </>
      )}
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

  const parts: string[] = [];

  if (usage.tokenLimit) {
    parts.push(`Tokens: ${formatRemainingPercent(usage.tokenLimit)}`);
  }
  if (usage.timeLimit) {
    parts.push(`Time: ${formatRemainingPercent(usage.timeLimit)}`);
  }

  const tokenText = usage.tokenLimit ? formatRemainingPercent(usage.tokenLimit) : "—";
  const numericPercent = getRemainingNumericPercent(usage.tokenLimit ?? usage.timeLimit);

  return {
    icon: numericPercent !== undefined ? generatePieIcon(numericPercent) : undefined,
    text: tokenText,
    tooltip: parts.join(" | ") || "No limits available",
  };
}
