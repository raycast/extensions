import { List } from "@raycast/api";
import React from "react";

import { formatPercentDisplay, toDisplayPercent, type PercentageDisplayMode } from "../agents/percentage-display.ts";
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
import type { ClaudeError, ClaudeUsage } from "./types.ts";

function accountLines(usage: ClaudeUsage): { account: string | null; organization: string | null } {
  return {
    account: usage.identity?.email ?? usage.identity?.displayName ?? null,
    organization: usage.identity?.organizationName ?? null,
  };
}

function formatWindow(name: string, percent: number, resetsIn: string | null, mode: PercentageDisplayMode): string {
  let text = `\n\n${name}: ${generateAsciiBar(toDisplayPercent(percent, mode))} ${formatPercentDisplay(percent, mode)}`;
  if (resetsIn) {
    text += `\nResets In: ${resetsIn}`;
  }
  return text;
}

function formatModelLabel(key: string): string {
  return `Weekly ${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

export function formatClaudeUsageText(usage: ClaudeUsage | null, error: ClaudeError | null): string {
  const fallback = formatErrorOrNoData("Claude", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as ClaudeUsage;

  const mode = getPercentageDisplayMode();
  const { account, organization } = accountLines(u);
  let text = "Claude Usage";
  if (account) text += `\nAccount: ${account}`;
  if (organization) text += `\nOrganization: ${organization}`;
  text += `\nPlan: ${u.plan}`;
  text += formatWindow("5h Limit", u.fiveHour.percentageRemaining, u.fiveHour.resetsIn, mode);

  if (u.sevenDay) {
    text += formatWindow("Weekly Limit", u.sevenDay.percentageRemaining, u.sevenDay.resetsIn, mode);
  }

  for (const [model, window] of Object.entries(u.modelWindows || {})) {
    text += formatWindow(formatModelLabel(model), window.percentageRemaining, window.resetsIn, mode);
  }

  if (u.extraUsage) {
    text += `\n\nExtra Usage: ${u.extraUsage.currency} ${u.extraUsage.used.toFixed(2)} / ${u.extraUsage.currency} ${u.extraUsage.limit.toFixed(2)}`;
  }

  return text;
}

export function renderClaudeDetail(usage: ClaudeUsage | null, error: ClaudeError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as ClaudeUsage;
  const mode = getPercentageDisplayMode();

  return (
    <List.Item.Detail.Metadata>
      {accountLines(u).account && (
        <List.Item.Detail.Metadata.Label title="Account" text={accountLines(u).account as string} />
      )}
      {accountLines(u).organization && (
        <List.Item.Detail.Metadata.Label title="Organization" text={accountLines(u).organization as string} />
      )}
      <List.Item.Detail.Metadata.Label title="Plan" text={u.plan} />
      <List.Item.Detail.Metadata.Separator />

      <List.Item.Detail.Metadata.Label
        title="5h Limit"
        text={`${generateAsciiBar(toDisplayPercent(u.fiveHour.percentageRemaining, mode))} ${formatPercentDisplay(u.fiveHour.percentageRemaining, mode)}`}
      />
      {u.fiveHour.resetsIn && <List.Item.Detail.Metadata.Label title="Resets In" text={u.fiveHour.resetsIn} />}

      {u.sevenDay && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Weekly Limit"
            text={`${generateAsciiBar(toDisplayPercent(u.sevenDay.percentageRemaining, mode))} ${formatPercentDisplay(u.sevenDay.percentageRemaining, mode)}`}
          />
          {u.sevenDay.resetsIn && <List.Item.Detail.Metadata.Label title="Resets In" text={u.sevenDay.resetsIn} />}
        </>
      )}

      {Object.entries(u.modelWindows || {}).map(([model, window]) => (
        <React.Fragment key={model}>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={formatModelLabel(model)}
            text={`${generateAsciiBar(toDisplayPercent(window.percentageRemaining, mode))} ${formatPercentDisplay(window.percentageRemaining, mode)}`}
          />
          {window.resetsIn && <List.Item.Detail.Metadata.Label title="Resets In" text={window.resetsIn} />}
        </React.Fragment>
      ))}

      {u.extraUsage && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Extra Usage"
            text={`${u.extraUsage.currency} ${u.extraUsage.used.toFixed(2)} / ${u.extraUsage.currency} ${u.extraUsage.limit.toFixed(2)}`}
          />
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

export function getClaudeAccessory(
  usage: ClaudeUsage | null,
  error: ClaudeError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) {
    return getLoadingAccessory("Claude");
  }

  if (error) {
    if (error.type === "not_configured") {
      return { text: "Not Configured", tooltip: error.message };
    }
    if (error.type === "missing_scope") {
      return { text: "Missing Scope", tooltip: error.message };
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
  const { account } = accountLines(usage);
  const tooltipParts = account ? [account] : [];
  tooltipParts.push(`5h Limit: ${toDisplayPercent(usage.fiveHour.percentageRemaining, mode)}%`);
  if (usage.sevenDay) {
    tooltipParts.push(`Weekly Limit: ${toDisplayPercent(usage.sevenDay.percentageRemaining, mode)}%`);
  }
  for (const [model, window] of Object.entries(usage.modelWindows || {})) {
    tooltipParts.push(`${formatModelLabel(model)}: ${toDisplayPercent(window.percentageRemaining, mode)}%`);
  }
  if (usage.extraUsage) {
    tooltipParts.push(
      `Extra: ${usage.extraUsage.currency} ${usage.extraUsage.used.toFixed(2)} / ${usage.extraUsage.limit.toFixed(2)}`,
    );
  }

  return {
    icon: generatePieIcon(usage.fiveHour.percentageRemaining),
    text: `${toDisplayPercent(usage.fiveHour.percentageRemaining, mode)}%`,
    tooltip: tooltipParts.join("\n"),
  };
}
