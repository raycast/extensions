import { List } from "@raycast/api";
import { CodexUsage, CodexError } from "./types";
import { formatDuration } from "./fetcher";
import { renderErrorDetail, renderNoDataDetail, getLoadingAccessory, getNoDataAccessory } from "../agents/ui";

export function formatCodexUsageText(usage: CodexUsage | null, error: CodexError | null): string {
  if (error) {
    return `Codex Usage\nStatus: Error\nType: ${error.type}\nMessage: ${error.message}`;
  }
  if (!usage) {
    return "Codex Usage\nStatus: No data available";
  }

  let text = `Codex Usage\nAccount: ${usage.account}`;
  text += `\n\n5h Limit: ${usage.fiveHourLimit.percentageRemaining}% remaining`;
  text += `\nResets In: ${formatDuration(usage.fiveHourLimit.resetsInSeconds)}`;
  text += `\n\nWeekly Limit: ${usage.weeklyLimit.percentageRemaining}% remaining`;
  text += `\nResets In: ${formatDuration(usage.weeklyLimit.resetsInSeconds)}`;

  if (usage.codeReviewLimit) {
    text += `\n\nCode Review Limit: ${usage.codeReviewLimit.percentageRemaining}% remaining`;
    text += `\nResets In: ${formatDuration(usage.codeReviewLimit.resetsInSeconds)}`;
  }

  text += `\n\nCredits: ${usage.credits.unlimited ? "Unlimited" : usage.credits.balance}`;

  return text;
}

export function renderCodexDetail(usage: CodexUsage | null, error: CodexError | null): React.ReactNode {
  if (error) {
    return renderErrorDetail(error);
  }

  if (!usage) {
    return renderNoDataDetail();
  }

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Account" text={usage.account} />
      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label
        title="5h Limit"
        text={`${usage.fiveHourLimit.percentageRemaining}% remaining`}
      />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatDuration(usage.fiveHourLimit.resetsInSeconds)} />

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label
        title="Weekly Limit"
        text={`${usage.weeklyLimit.percentageRemaining}% remaining`}
      />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatDuration(usage.weeklyLimit.resetsInSeconds)} />

      {usage.codeReviewLimit && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Code Review Limit"
            text={`${usage.codeReviewLimit.percentageRemaining}% remaining`}
          />
          <List.Item.Detail.Metadata.Label
            title="Resets In"
            text={formatDuration(usage.codeReviewLimit.resetsInSeconds)}
          />
        </>
      )}

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label
        title="Credits"
        text={usage.credits.unlimited ? "Unlimited" : usage.credits.balance}
      />
    </List.Item.Detail.Metadata>
  );
}

export function getCodexAccessory(
  usage: CodexUsage | null,
  error: CodexError | null,
  isLoading: boolean,
): { text: string; tooltip?: string } {
  if (isLoading) {
    return getLoadingAccessory("Codex");
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

  // 显示 5h Limit 百分比
  return {
    text: `${usage.fiveHourLimit.percentageRemaining}%`,
    tooltip: `5h: ${usage.fiveHourLimit.percentageRemaining}% | Weekly: ${usage.weeklyLimit.percentageRemaining}%`,
  };
}
