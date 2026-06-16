import { List } from "@raycast/api";
import { formatResetTime } from "../agents/format";
import type { Accessory } from "../agents/types";
import {
  formatErrorOrNoData,
  generateAsciiBar,
  generatePieIcon,
  getLoadingAccessory,
  getNoDataAccessory,
  renderErrorOrNoData,
} from "../agents/ui";
import type { CopilotError, CopilotUsage } from "./types";

function formatPercent(value: number | null): string {
  return value === null ? "N/A" : `${value}%`;
}

export function formatCopilotUsageText(usage: CopilotUsage | null, error: CopilotError | null): string {
  const fallback = formatErrorOrNoData("Copilot", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as CopilotUsage;

  let text = `Copilot Usage\nPlan: ${u.plan}`;
  if (u.premiumRemaining !== null) {
    text += `\n\nPremium Interactions: ${generateAsciiBar(u.premiumRemaining)} ${formatPercent(u.premiumRemaining)} remaining`;
  } else {
    text += `\n\nPremium Interactions: ${formatPercent(u.premiumRemaining)} remaining`;
  }
  if (u.chatRemaining !== null) {
    text += `\nChat Quota: ${generateAsciiBar(u.chatRemaining)} ${formatPercent(u.chatRemaining)} remaining`;
  } else {
    text += `\nChat Quota: ${formatPercent(u.chatRemaining)} remaining`;
  }
  if (u.quotaResetDate) {
    text += `\nQuota Reset: ${formatResetTime(u.quotaResetDate)}`;
  }

  return text;
}

export function renderCopilotDetail(usage: CopilotUsage | null, error: CopilotError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as CopilotUsage;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Plan" text={u.plan} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Premium Interactions"
        text={
          u.premiumRemaining !== null
            ? `${generateAsciiBar(u.premiumRemaining)} ${formatPercent(u.premiumRemaining)} remaining`
            : `${formatPercent(u.premiumRemaining)} remaining`
        }
      />
      <List.Item.Detail.Metadata.Label
        title="Chat Quota"
        text={
          u.chatRemaining !== null
            ? `${generateAsciiBar(u.chatRemaining)} ${formatPercent(u.chatRemaining)} remaining`
            : `${formatPercent(u.chatRemaining)} remaining`
        }
      />
      {u.quotaResetDate && (
        <List.Item.Detail.Metadata.Label title="Quota Reset" text={formatResetTime(u.quotaResetDate)} />
      )}
    </List.Item.Detail.Metadata>
  );
}

export function getCopilotAccessory(
  usage: CopilotUsage | null,
  error: CopilotError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) {
    return getLoadingAccessory("Copilot");
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

  const primaryPercent = usage.premiumRemaining ?? usage.chatRemaining;
  const text = primaryPercent !== null ? `${primaryPercent}%` : "—";
  const tooltip = `Premium: ${formatPercent(usage.premiumRemaining)} | Chat: ${formatPercent(usage.chatRemaining)}`;

  return {
    icon: primaryPercent !== null ? generatePieIcon(primaryPercent) : undefined,
    text,
    tooltip,
  };
}
