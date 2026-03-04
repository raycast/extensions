import { List } from "@raycast/api";
import { CodexUsage, CodexError } from "./types";
import type { Accessory } from "../agents/types";
import { formatDuration } from "./fetcher";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
} from "../agents/ui";

export function formatCodexUsageText(usage: CodexUsage | null, error: CodexError | null): string {
  const fallback = formatErrorOrNoData("Codex", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as CodexUsage;

  let text = `Codex Usage\nAccount: ${u.account}`;
  text += `\n\n5h Limit: ${u.fiveHourLimit.percentageRemaining}% remaining`;
  text += `\nResets In: ${formatDuration(u.fiveHourLimit.resetsInSeconds)}`;
  text += `\n\nWeekly Limit: ${u.weeklyLimit.percentageRemaining}% remaining`;
  text += `\nResets In: ${formatDuration(u.weeklyLimit.resetsInSeconds)}`;

  if (u.codeReviewLimit) {
    text += `\n\nCode Review Limit: ${u.codeReviewLimit.percentageRemaining}% remaining`;
    text += `\nResets In: ${formatDuration(u.codeReviewLimit.resetsInSeconds)}`;
  }

  text += `\n\nCredits: ${u.credits.unlimited ? "Unlimited" : u.credits.balance}`;

  return text;
}

export function renderCodexDetail(usage: CodexUsage | null, error: CodexError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as CodexUsage;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Account" text={u.account} />
      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="5h Limit" text={`${u.fiveHourLimit.percentageRemaining}% remaining`} />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatDuration(u.fiveHourLimit.resetsInSeconds)} />

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="Weekly Limit" text={`${u.weeklyLimit.percentageRemaining}% remaining`} />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatDuration(u.weeklyLimit.resetsInSeconds)} />

      {u.codeReviewLimit && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Code Review Limit"
            text={`${u.codeReviewLimit.percentageRemaining}% remaining`}
          />
          <List.Item.Detail.Metadata.Label title="Resets In" text={formatDuration(u.codeReviewLimit.resetsInSeconds)} />
        </>
      )}

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label title="Credits" text={u.credits.unlimited ? "Unlimited" : u.credits.balance} />
    </List.Item.Detail.Metadata>
  );
}

export function getCodexAccessory(usage: CodexUsage | null, error: CodexError | null, isLoading: boolean): Accessory {
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

  return {
    icon: generatePieIcon(usage.fiveHourLimit.percentageRemaining),
    text: `${usage.fiveHourLimit.percentageRemaining}%`,
    tooltip: `5h: ${usage.fiveHourLimit.percentageRemaining}% | Weekly: ${usage.weeklyLimit.percentageRemaining}%`,
  };
}
