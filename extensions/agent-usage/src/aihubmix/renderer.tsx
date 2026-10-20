import { Icon, List } from "@raycast/api";

import type { Accessory } from "../agents/types.ts";
import { formatErrorOrNoData, getLoadingAccessory, getNoDataAccessory, renderErrorOrNoData } from "../agents/ui.tsx";
import type { AihubmixError, AihubmixUsage } from "./types.ts";

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function formatAihubmixUsageText(usage: AihubmixUsage | null, error: AihubmixError | null): string {
  const fallback = formatErrorOrNoData("AIHubMix", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AihubmixUsage;

  return [
    "AIHubMix Usage",
    `Remaining: ${formatUsd(u.remainingUsd)}`,
    `Used: ${formatUsd(u.usedUsd)}`,
    `Requests: ${u.requestCount.toLocaleString()}`,
    `Account: ${u.username}`,
  ].join("\n");
}

export function renderAihubmixDetail(usage: AihubmixUsage | null, error: AihubmixError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AihubmixUsage;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Remaining" text={formatUsd(u.remainingUsd)} />
      <List.Item.Detail.Metadata.Label title="Used" text={formatUsd(u.usedUsd)} />
      <List.Item.Detail.Metadata.Label title="Requests" text={u.requestCount.toLocaleString()} />
      <List.Item.Detail.Metadata.Label title="Account" text={u.username} />
    </List.Item.Detail.Metadata>
  );
}

export function getAihubmixAccessory(
  usage: AihubmixUsage | null,
  error: AihubmixError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) return getLoadingAccessory("AIHubMix");

  if (error) {
    if (error.type === "not_configured") return { text: "Not Configured", tooltip: error.message };
    if (error.type === "unauthorized") return { text: "Key Invalid", tooltip: error.message };
    if (error.type === "network_error") return { text: "Network Error", tooltip: error.message };
    if (error.type === "parse_error") return { text: "Parse Error", tooltip: error.message };
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) return getNoDataAccessory();

  const remaining = formatUsd(usage.remainingUsd);
  return {
    icon: Icon.Coins,
    text: remaining,
    tooltip: `Remaining: ${remaining} (used ${formatUsd(usage.usedUsd)})`,
  };
}
