import { List } from "@raycast/api";

import { formatResetTime } from "../agents/format.ts";
import { toDisplayPercent, type PercentageDisplayMode } from "../agents/percentage-display.ts";
import type { Accessory } from "../agents/types.ts";
import {
  formatErrorOrNoData,
  generateAsciiBar,
  generatePieIcon,
  getLoadingAccessory,
  getNoDataAccessory,
  getPercentageDisplayMode,
  renderErrorOrNoData,
} from "../agents/ui.tsx";
import type { CopilotError, CopilotUsage } from "./types.ts";

function formatPercent(value: number | null, mode: PercentageDisplayMode): string {
  return value === null ? "N/A" : `${toDisplayPercent(value, mode)}%`;
}

function getAiCreditsRemainingPercent(usage: CopilotUsage): number | null {
  return usage.aiCreditsRemainingPercent ?? usage.premiumRemaining ?? null;
}

function formatCreditAmount(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function formatAiCreditsBalance(usage: CopilotUsage): string | null {
  const remaining = usage.aiCreditsRemaining ?? null;
  const entitlement = usage.aiCreditsEntitlement ?? null;
  if (remaining === null) return null;
  if (entitlement === null) return `${formatCreditAmount(remaining)} credits`;
  return `${formatCreditAmount(remaining)} / ${formatCreditAmount(entitlement)} credits`;
}

export function formatCopilotUsageText(usage: CopilotUsage | null, error: CopilotError | null): string {
  const fallback = formatErrorOrNoData("Copilot", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as CopilotUsage;
  const mode = getPercentageDisplayMode();
  const aiCreditsRemainingPercent = getAiCreditsRemainingPercent(u);
  const aiCreditsBalance = formatAiCreditsBalance(u);

  let text = `Copilot Usage\nPlan: ${u.plan}`;
  if (aiCreditsRemainingPercent !== null) {
    text += `\n\nAI Credits: ${generateAsciiBar(toDisplayPercent(aiCreditsRemainingPercent, mode))} ${formatPercent(aiCreditsRemainingPercent, mode)} ${mode}`;
  } else {
    text += `\n\nAI Credits: ${formatPercent(aiCreditsRemainingPercent, mode)} ${mode}`;
  }
  if (aiCreditsBalance) {
    text += `\nAI Credits Balance: ${aiCreditsBalance}`;
  }
  if (u.chatRemaining !== null) {
    text += `\nChat Quota: ${generateAsciiBar(toDisplayPercent(u.chatRemaining, mode))} ${formatPercent(u.chatRemaining, mode)} ${mode}`;
  } else {
    text += `\nChat Quota: ${formatPercent(u.chatRemaining, mode)} ${mode}`;
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
  const mode = getPercentageDisplayMode();
  const aiCreditsRemainingPercent = getAiCreditsRemainingPercent(u);
  const aiCreditsBalance = formatAiCreditsBalance(u);

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Plan" text={u.plan} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="AI Credits"
        text={
          aiCreditsRemainingPercent !== null
            ? `${generateAsciiBar(toDisplayPercent(aiCreditsRemainingPercent, mode))} ${formatPercent(aiCreditsRemainingPercent, mode)} ${mode}`
            : `${formatPercent(aiCreditsRemainingPercent, mode)} ${mode}`
        }
      />
      {aiCreditsBalance && <List.Item.Detail.Metadata.Label title="AI Credits Balance" text={aiCreditsBalance} />}
      <List.Item.Detail.Metadata.Label
        title="Chat Quota"
        text={
          u.chatRemaining !== null
            ? `${generateAsciiBar(toDisplayPercent(u.chatRemaining, mode))} ${formatPercent(u.chatRemaining, mode)} ${mode}`
            : `${formatPercent(u.chatRemaining, mode)} ${mode}`
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

  const mode = getPercentageDisplayMode();
  const aiCreditsRemainingPercent = getAiCreditsRemainingPercent(usage);
  const aiCreditsBalance = formatAiCreditsBalance(usage);
  const primaryPercent = aiCreditsRemainingPercent ?? usage.chatRemaining;
  const text = primaryPercent !== null ? `${toDisplayPercent(primaryPercent, mode)}%` : "—";
  const tooltip = [
    `AI Credits: ${formatPercent(aiCreditsRemainingPercent, mode)}`,
    aiCreditsBalance ? `Balance: ${aiCreditsBalance}` : null,
    `Chat: ${formatPercent(usage.chatRemaining, mode)}`,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    icon: primaryPercent !== null ? generatePieIcon(primaryPercent) : undefined,
    text,
    tooltip,
  };
}
