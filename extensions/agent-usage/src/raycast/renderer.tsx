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
import type { RaycastError, RaycastUsage } from "./types.ts";

const creditFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function formatCredits(value: number | null): string {
  return value === null ? "—" : creditFormatter.format(value);
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatBalance(usage: RaycastUsage): string {
  return `${formatCredits(usage.remainingCredits)} / ${formatCredits(usage.totalCredits)} credits`;
}

export function formatRaycastUsageText(usage: RaycastUsage | null, error: RaycastError | null): string {
  const fallback = formatErrorOrNoData("Raycast", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as RaycastUsage;
  const mode = getPercentageDisplayMode();

  const lines = ["Raycast Usage"];
  if (u.plan) lines.push(`Plan: ${u.plan}`);
  if (u.percentageRemaining !== null) {
    lines.push(
      "",
      `Credits: ${formatPercentDisplay(u.percentageRemaining, mode, formatPercent)}`,
      generateAsciiBar(toDisplayPercent(u.percentageRemaining, mode)),
      `Remaining: ${formatBalance(u)}`,
    );
  } else {
    lines.push("", `Left: ${formatCredits(u.remainingCredits)}`, `Total: ${formatCredits(u.totalCredits)}`);
  }
  if (u.nextCreditsAt) lines.push(`Renews In: ${formatResetTime(u.nextCreditsAt)}`);
  return lines.join("\n");
}

export function renderRaycastDetail(usage: RaycastUsage | null, error: RaycastError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as RaycastUsage;
  const mode = getPercentageDisplayMode();

  return (
    <List.Item.Detail.Metadata>
      {u.plan && (
        <>
          <List.Item.Detail.Metadata.Label title="Plan" text={u.plan} />
          <List.Item.Detail.Metadata.Separator />
        </>
      )}
      {u.percentageRemaining !== null ? (
        <>
          <List.Item.Detail.Metadata.Label
            title="AI Credits"
            text={`${generateAsciiBar(toDisplayPercent(u.percentageRemaining, mode))} ${formatPercentDisplay(u.percentageRemaining, mode, formatPercent)}`}
          />
          <List.Item.Detail.Metadata.Label title="Remaining" text={formatBalance(u)} />
        </>
      ) : (
        <>
          <List.Item.Detail.Metadata.Label title="Credits Left" text={formatCredits(u.remainingCredits)} />
          <List.Item.Detail.Metadata.Label title="Credits Total" text={formatCredits(u.totalCredits)} />
        </>
      )}
      {u.nextCreditsAt && <List.Item.Detail.Metadata.Label title="Renews In" text={formatResetTime(u.nextCreditsAt)} />}
    </List.Item.Detail.Metadata>
  );
}

export function getRaycastAccessory(
  usage: RaycastUsage | null,
  error: RaycastError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) return getLoadingAccessory("Raycast");

  if (error) {
    if (error.type === "not_configured") return { text: "Not Configured", tooltip: error.message };
    if (error.type === "unauthorized") return { text: "Session Expired", tooltip: error.message };
    if (error.type === "network_error") return { text: "Network Error", tooltip: error.message };
    if (error.type === "parse_error") return { text: "Parse Error", tooltip: error.message };
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) return getNoDataAccessory();

  const renews = usage.nextCreditsAt ? ` | Renews in ${formatResetTime(usage.nextCreditsAt)}` : "";
  if (usage.percentageRemaining === null) {
    // Without a positive total there is no meter; show whichever amount the API reported.
    const amount = usage.remainingCredits ?? usage.totalCredits;
    const label = usage.remainingCredits !== null ? "AI credits left" : "AI credit allowance";
    return {
      icon: Icon.Coins,
      text: `${formatCredits(amount)} credits`,
      tooltip: `${label}: ${formatCredits(amount)}${renews}`,
    };
  }

  const mode = getPercentageDisplayMode();
  return {
    icon: generatePieIcon(usage.percentageRemaining),
    text: `${formatPercent(toDisplayPercent(usage.percentageRemaining, mode))}%`,
    tooltip: `AI credits: ${formatPercentDisplay(usage.percentageRemaining, mode, formatPercent)} | ${formatBalance(usage)} left${renews}`,
  };
}
