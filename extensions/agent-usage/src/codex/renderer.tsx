import { List } from "@raycast/api";
import { CodexUsage, CodexError } from "./types";
import type { Accessory } from "../agents/types";
import { formatDuration, formatResetTime } from "../agents/format";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui";

export function formatCodexUsageText(usage: CodexUsage | null, error: CodexError | null): string {
  const fallback = formatErrorOrNoData("Codex", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as CodexUsage;

  let text = `Codex Usage\nAccount: ${u.account}`;
  text += `\n\n5h Limit: ${u.fiveHourLimit.percentageRemaining}% remaining`;
  text += `\n${generateAsciiBar(u.fiveHourLimit.percentageRemaining)}`;
  text += `\nResets In: ${formatDuration(u.fiveHourLimit.resetsInSeconds)}`;
  text += `\n\nWeekly Limit: ${u.weeklyLimit.percentageRemaining}% remaining`;
  text += `\n${generateAsciiBar(u.weeklyLimit.percentageRemaining)}`;
  text += `\nResets In: ${formatDuration(u.weeklyLimit.resetsInSeconds)}`;

  if (u.codeReviewLimit) {
    text += `\n\nCode Review Limit: ${u.codeReviewLimit.percentageRemaining}% remaining`;
    text += `\nResets In: ${formatDuration(u.codeReviewLimit.resetsInSeconds)}`;
  }

  text += `\n\nCredits: ${u.credits.unlimited ? "Unlimited" : u.credits.balance}`;

  if (u.resetCredits) {
    text += `\nLimit Reset Credits: ${formatResetCredits(u.resetCredits.availableCount)}`;
    if (u.resetCredits.nextExpiresAt) {
      text += `\nNext Expires In: ${formatResetTime(u.resetCredits.nextExpiresAt)}`;
    }
    if (u.resetCreditsError) {
      text += `\nReset Credits Error: ${u.resetCreditsError}`;
    }
  }

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

      <List.Item.Detail.Metadata.Label
        title="5h Limit"
        text={`${generateAsciiBar(u.fiveHourLimit.percentageRemaining)} ${u.fiveHourLimit.percentageRemaining}% remaining`}
      />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatDuration(u.fiveHourLimit.resetsInSeconds)} />

      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label
        title="Weekly Limit"
        text={`${generateAsciiBar(u.weeklyLimit.percentageRemaining)} ${u.weeklyLimit.percentageRemaining}% remaining`}
      />
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

      {u.resetCredits && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Limit Reset Credits"
            text={formatResetCredits(u.resetCredits.availableCount)}
          />
          {u.resetCredits.nextExpiresAt && (
            <List.Item.Detail.Metadata.Label
              title="Next Expires In"
              text={formatResetTime(u.resetCredits.nextExpiresAt)}
            />
          )}
          {u.resetCreditsError && (
            <List.Item.Detail.Metadata.Label title="Reset Credits Error" text={u.resetCreditsError} />
          )}
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

function formatResetCredits(availableCount: number | null): string {
  return availableCount === null
    ? "Unavailable"
    : `${availableCount} manual reset${availableCount === 1 ? "" : "s"} available`;
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
