import { List } from "@raycast/api";

import { formatDuration, formatResetTime, parseDate } from "../agents/format.ts";
import type { Accessory } from "../agents/types.ts";
import {
  formatErrorOrNoData,
  generateAsciiBar,
  generatePieIcon,
  getLoadingAccessory,
  getNoDataAccessory,
  renderErrorOrNoData,
} from "../agents/ui.tsx";
import type { ClinePassError, ClinePassLimit, ClinePassUsage } from "./types.ts";

function formatCredits(balanceUsd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(balanceUsd);
}

function formatResetDate(resetsAt: string | undefined, maxResetSeconds: number): string {
  if (!resetsAt) return formatDuration(maxResetSeconds);
  const date = parseDate(resetsAt);
  if (!date) return formatDuration(maxResetSeconds);
  const absolute = date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${absolute} (${formatResetTime(resetsAt)})`;
}

function formatLimitText(label: string, limit: ClinePassLimit): string {
  return `${label}: ${limit.percentageRemaining}% remaining\n${generateAsciiBar(limit.percentageRemaining)}\nResets: ${formatResetDate(limit.resetsAt, limit.maxResetSeconds)}`;
}

export function formatClinePassUsageText(usage: ClinePassUsage | null, error: ClinePassError | null): string {
  const fallback = formatErrorOrNoData("ClinePass", usage, error);
  if (fallback !== null) return fallback;
  const current = usage as ClinePassUsage;
  return [
    "ClinePass Usage",
    `Account: ${current.account}`,
    `User ID: ${current.userId}`,
    "",
    formatLimitText("5h Limit", current.fiveHourLimit),
    "",
    formatLimitText("Weekly Limit", current.weeklyLimit),
    "",
    formatLimitText("Monthly Limit", current.monthlyLimit),
    "",
    `Credits: ${formatCredits(current.credits.balanceUsd)}`,
  ].join("\n");
}

function renderLimit(label: string, limit: ClinePassLimit): React.ReactNode {
  return (
    <>
      <List.Item.Detail.Metadata.Label
        title={label}
        text={`${generateAsciiBar(limit.percentageRemaining)} ${limit.percentageRemaining}% remaining`}
      />
      <List.Item.Detail.Metadata.Label title="Resets" text={formatResetDate(limit.resetsAt, limit.maxResetSeconds)} />
    </>
  );
}

export function renderClinePassDetail(usage: ClinePassUsage | null, error: ClinePassError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const current = usage as ClinePassUsage;
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Account" text={current.account} />
      <List.Item.Detail.Metadata.Label title="User ID" text={current.userId} />
      <List.Item.Detail.Metadata.Separator />
      {renderLimit("5h Limit", current.fiveHourLimit)}
      <List.Item.Detail.Metadata.Separator />
      {renderLimit("Weekly Limit", current.weeklyLimit)}
      <List.Item.Detail.Metadata.Separator />
      {renderLimit("Monthly Limit", current.monthlyLimit)}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Credits" text={formatCredits(current.credits.balanceUsd)} />
    </List.Item.Detail.Metadata>
  );
}

export function getClinePassAccessory(
  usage: ClinePassUsage | null,
  error: ClinePassError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) return getLoadingAccessory("ClinePass");
  if (error) {
    if (error.type === "not_configured") return { text: "Not Configured", tooltip: error.message };
    if (error.type === "unauthorized") return { text: "Token Expired", tooltip: error.message };
    if (error.type === "network_error") return { text: "Network Error", tooltip: error.message };
    return { text: "Error", tooltip: error.message };
  }
  if (!usage) return getNoDataAccessory();
  const remaining = usage.fiveHourLimit.percentageRemaining;
  return {
    icon: generatePieIcon(remaining),
    text: `${remaining}%`,
    tooltip: `5h: ${remaining}% | Weekly: ${usage.weeklyLimit.percentageRemaining}% | Monthly: ${usage.monthlyLimit.percentageRemaining}% | Credits: ${formatCredits(usage.credits.balanceUsd)}`,
  };
}
