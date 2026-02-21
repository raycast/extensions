import { List } from "@raycast/api";
import { ZaiUsage, ZaiError, ZaiLimitEntry } from "./types";
import { formatResetTime } from "./fetcher";
import { renderErrorDetail, renderNoDataDetail, getLoadingAccessory, getNoDataAccessory } from "../agents/ui";

function formatUsageValue(entry: ZaiLimitEntry): string {
  if (entry.remaining != null && entry.usage != null && entry.usage > 0) {
    return `${Math.round(((entry.usage - entry.remaining) / entry.usage) * 100)}%`;
  }
  return `${entry.percentage}%`;
}

function formatRemainingText(entry: ZaiLimitEntry): string {
  if (entry.remaining != null && entry.usage != null) {
    return `${entry.remaining}/${entry.usage}`;
  }
  if (entry.currentValue != null) {
    return `${entry.currentValue}`;
  }
  return `${entry.percentage}%`;
}

export function formatZaiUsageText(usage: ZaiUsage | null, error: ZaiError | null): string {
  if (error) {
    return `z.ai Usage\nStatus: Error\nType: ${error.type}\nMessage: ${error.message}`;
  }
  if (!usage) {
    return "z.ai Usage\nStatus: No data available";
  }

  let text = "z.ai Usage";

  if (usage.planName) {
    text += `\nPlan: ${usage.planName}`;
  }

  if (usage.tokenLimit) {
    text += `\n\nToken Limit (${usage.tokenLimit.windowDescription}): ${formatRemainingText(usage.tokenLimit)}`;
    text += `\n${formatUsageValue(usage.tokenLimit)}`;
    if (usage.tokenLimit.resetTime) {
      text += `\nResets In: ${formatResetTime(usage.tokenLimit.resetTime)}`;
    }
    if (usage.tokenLimit.usageDetails.length > 0) {
      text += "\n\nPer-Model Usage:";
      for (const detail of usage.tokenLimit.usageDetails) {
        text += `\n  ${detail.modelCode}: ${detail.usage}`;
      }
    }
  }

  if (usage.timeLimit) {
    text += `\n\nTime Limit (${usage.timeLimit.windowDescription}): ${formatRemainingText(usage.timeLimit)}`;
    text += `\n${formatUsageValue(usage.timeLimit)}`;
    if (usage.timeLimit.resetTime) {
      text += `\nResets In: ${formatResetTime(usage.timeLimit.resetTime)}`;
    }
    if (usage.timeLimit.usageDetails.length > 0) {
      text += "\n\nPer-Model Usage:";
      for (const detail of usage.timeLimit.usageDetails) {
        text += `\n  ${detail.modelCode}: ${detail.usage}`;
      }
    }
  }

  return text;
}

export function renderZaiDetail(usage: ZaiUsage | null, error: ZaiError | null): React.ReactNode {
  if (error) {
    return renderErrorDetail(error);
  }

  if (!usage) {
    return renderNoDataDetail();
  }

  return (
    <List.Item.Detail.Metadata>
      {usage.planName && <List.Item.Detail.Metadata.Label title="Plan" text={usage.planName} />}

      {usage.tokenLimit && (
        <>
          {usage.planName && <List.Item.Detail.Metadata.Separator />}
          <List.Item.Detail.Metadata.Label
            title={`Token Limit (${usage.tokenLimit.windowDescription})`}
            text={formatUsageValue(usage.tokenLimit)}
          />
          <List.Item.Detail.Metadata.Label title="Remaining" text={formatRemainingText(usage.tokenLimit)} />
          {usage.tokenLimit.resetTime && (
            <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(usage.tokenLimit.resetTime)} />
          )}
          {usage.tokenLimit.usageDetails.map((detail) => (
            <List.Item.Detail.Metadata.Label
              key={detail.modelCode}
              title={`  ${detail.modelCode}`}
              text={`${detail.usage}`}
            />
          ))}
        </>
      )}

      {usage.timeLimit && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={`Time Limit (${usage.timeLimit.windowDescription})`}
            text={formatUsageValue(usage.timeLimit)}
          />
          <List.Item.Detail.Metadata.Label title="Remaining" text={formatRemainingText(usage.timeLimit)} />
          {usage.timeLimit.resetTime && (
            <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(usage.timeLimit.resetTime)} />
          )}
          {usage.timeLimit.usageDetails.map((detail) => (
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

export function getZaiAccessory(
  usage: ZaiUsage | null,
  error: ZaiError | null,
  isLoading: boolean,
): { text: string; tooltip?: string } {
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
    parts.push(`Tokens: ${formatUsageValue(usage.tokenLimit)}`);
  }
  if (usage.timeLimit) {
    parts.push(`Time: ${formatUsageValue(usage.timeLimit)}`);
  }

  const tokenText = usage.tokenLimit ? formatUsageValue(usage.tokenLimit) : "—";

  return {
    text: tokenText,
    tooltip: parts.join(" | ") || "No limits available",
  };
}
