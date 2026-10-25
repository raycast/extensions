import { Icon, List } from "@raycast/api";

import { formatResetTime } from "../agents/format.ts";
import { formatPercentDisplay, toDisplayPercent } from "../agents/percentage-display.ts";
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
import type { ElevenLabsError, ElevenLabsUsage } from "./types.ts";

const creditFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function formatCredits(value: number): string {
  return creditFormatter.format(value);
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatBalance(usage: ElevenLabsUsage): string {
  return `${formatCredits(usage.creditsRemaining)} / ${formatCredits(usage.creditLimit)} credits`;
}

function formatPlan(usage: ElevenLabsUsage): string | null {
  if (!usage.plan) return usage.status;
  return usage.status ? `${usage.plan} (${usage.status})` : usage.plan;
}

export function formatElevenLabsUsageText(usage: ElevenLabsUsage | null, error: ElevenLabsError | null): string {
  const fallback = formatErrorOrNoData("ElevenLabs", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as ElevenLabsUsage;
  const mode = getPercentageDisplayMode();

  const lines = ["ElevenLabs Usage"];
  const plan = formatPlan(u);
  if (plan) lines.push(`Plan: ${plan}`);
  if (u.percentageRemaining !== null) {
    lines.push(
      "",
      `Credits: ${formatPercentDisplay(u.percentageRemaining, mode, formatPercent)}`,
      generateAsciiBar(toDisplayPercent(u.percentageRemaining, mode)),
      `Remaining: ${formatBalance(u)}`,
    );
  } else {
    lines.push("", `Used: ${formatCredits(u.creditsUsed)} credits`);
  }
  if (u.resetsAt) lines.push(`Resets In: ${formatResetTime(u.resetsAt)}`);
  return lines.join("\n");
}

export function renderElevenLabsDetail(usage: ElevenLabsUsage | null, error: ElevenLabsError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as ElevenLabsUsage;
  const mode = getPercentageDisplayMode();
  const plan = formatPlan(u);

  return (
    <List.Item.Detail.Metadata>
      {plan && (
        <>
          <List.Item.Detail.Metadata.Label title="Plan" text={plan} />
          <List.Item.Detail.Metadata.Separator />
        </>
      )}
      {u.percentageRemaining !== null ? (
        <>
          <List.Item.Detail.Metadata.Label
            title="Credits"
            text={`${generateAsciiBar(toDisplayPercent(u.percentageRemaining, mode))} ${formatPercentDisplay(u.percentageRemaining, mode, formatPercent)}`}
          />
          <List.Item.Detail.Metadata.Label title="Remaining" text={formatBalance(u)} />
        </>
      ) : (
        <List.Item.Detail.Metadata.Label title="Credits Used" text={formatCredits(u.creditsUsed)} />
      )}
      {u.resetsAt && <List.Item.Detail.Metadata.Label title="Resets In" text={formatResetTime(u.resetsAt)} />}
    </List.Item.Detail.Metadata>
  );
}

export function getElevenLabsAccessory(
  usage: ElevenLabsUsage | null,
  error: ElevenLabsError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) return getLoadingAccessory("ElevenLabs");

  if (error) {
    if (error.type === "not_configured") return { text: "Not Configured", tooltip: error.message };
    if (error.type === "unauthorized") return { text: "Key Invalid", tooltip: error.message };
    if (error.type === "network_error") return { text: "Network Error", tooltip: error.message };
    if (error.type === "parse_error") return { text: "Parse Error", tooltip: error.message };
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) return getNoDataAccessory();

  const plan = formatPlan(usage);
  const prefix = plan ? `Plan: ${plan} | ` : "";
  const resets = usage.resetsAt ? ` | Resets in ${formatResetTime(usage.resetsAt)}` : "";
  if (usage.percentageRemaining === null) {
    return {
      icon: Icon.Coins,
      text: `${formatCredits(usage.creditsUsed)} used`,
      tooltip: `${prefix}${formatCredits(usage.creditsUsed)} credits used${resets}`,
    };
  }

  const mode = getPercentageDisplayMode();
  return {
    icon: generatePieIcon(usage.percentageRemaining),
    text: `${formatPercent(toDisplayPercent(usage.percentageRemaining, mode))}%`,
    tooltip: `${prefix}Credits: ${formatPercentDisplay(usage.percentageRemaining, mode, formatPercent)} | ${formatBalance(usage)} left${resets}`,
  };
}
