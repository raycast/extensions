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
import type { GrokError, GrokUsage } from "./types";

function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatReset(value: string | null): string {
  return value ? formatResetTime(value) : "unknown";
}

export function formatGrokUsageText(usage: GrokUsage | null, error: GrokError | null): string {
  const fallback = formatErrorOrNoData("Grok", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as GrokUsage;

  let text = `Grok Usage\nSource: ${u.source}`;
  if (u.loginMethod) {
    text += `\nPlan: ${u.loginMethod}`;
  }

  text += `\n\n${u.windowLabel}: ${formatPercent(u.percentageRemaining)}% remaining`;
  text += `\n${generateAsciiBar(u.percentageRemaining)}`;
  text += `\nUsed: ${formatPercent(u.usedPercent)}%`;
  text += `\nResets In: ${formatReset(u.resetsAt)}`;

  return text;
}

export function renderGrokDetail(usage: GrokUsage | null, error: GrokError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as GrokUsage;

  return (
    <List.Item.Detail.Metadata>
      {u.loginMethod && (
        <>
          <List.Item.Detail.Metadata.Label title="Plan" text={u.loginMethod} />
          <List.Item.Detail.Metadata.Separator />
        </>
      )}
      <List.Item.Detail.Metadata.Label
        title={u.windowLabel}
        text={`${generateAsciiBar(u.percentageRemaining)} ${formatPercent(u.percentageRemaining)}% remaining`}
      />
      <List.Item.Detail.Metadata.Label title="Used" text={`${formatPercent(u.usedPercent)}%`} />
      <List.Item.Detail.Metadata.Label title="Resets In" text={formatReset(u.resetsAt)} />
    </List.Item.Detail.Metadata>
  );
}

export function getGrokAccessory(usage: GrokUsage | null, error: GrokError | null, isLoading: boolean): Accessory {
  if (isLoading) {
    return getLoadingAccessory("Grok");
  }

  if (error) {
    if (error.type === "not_configured") {
      return { text: "Not Configured", tooltip: error.message };
    }
    if (error.type === "unauthorized") {
      return { text: "Session Expired", tooltip: error.message };
    }
    if (error.type === "network_error") {
      return { text: "Network Error", tooltip: error.message };
    }
    if (error.type === "parse_error") {
      return { text: "Parse Error", tooltip: error.message };
    }
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) {
    return getNoDataAccessory();
  }

  const remaining = usage.percentageRemaining;
  return {
    icon: generatePieIcon(remaining),
    text: `${formatPercent(remaining)}%`,
    tooltip: `${usage.windowLabel}: ${formatPercent(remaining)}% remaining`,
  };
}
