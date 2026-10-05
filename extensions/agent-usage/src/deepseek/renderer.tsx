import { Icon, List } from "@raycast/api";

import type { Accessory } from "../agents/types.ts";
import { formatErrorOrNoData, getLoadingAccessory, getNoDataAccessory, renderErrorOrNoData } from "../agents/ui.tsx";
import type { DeepSeekError, DeepSeekUsage } from "./types.ts";

function formatBalance(value: number, currency: string): string {
  const prefix = currency === "CNY" ? "¥" : currency === "USD" ? "$" : `${currency} `;
  return `${prefix}${value.toFixed(2)}`;
}

export function formatDeepSeekUsageText(usage: DeepSeekUsage | null, error: DeepSeekError | null): string {
  const fallback = formatErrorOrNoData("DeepSeek", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as DeepSeekUsage;

  return [
    "DeepSeek Usage",
    `API Status: ${u.isAvailable ? "Available" : "Unavailable"}`,
    `Total Balance: ${formatBalance(u.totalBalance, u.currency)}`,
    `Topped Up: ${formatBalance(u.toppedUpBalance, u.currency)}`,
    `Granted: ${formatBalance(u.grantedBalance, u.currency)}`,
  ].join("\n");
}

export function renderDeepSeekDetail(usage: DeepSeekUsage | null, error: DeepSeekError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as DeepSeekUsage;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="API Status" text={u.isAvailable ? "Available" : "Unavailable"} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Total Balance" text={formatBalance(u.totalBalance, u.currency)} />
      <List.Item.Detail.Metadata.Label title="Topped Up" text={formatBalance(u.toppedUpBalance, u.currency)} />
      <List.Item.Detail.Metadata.Label title="Granted" text={formatBalance(u.grantedBalance, u.currency)} />
    </List.Item.Detail.Metadata>
  );
}

export function getDeepSeekAccessory(
  usage: DeepSeekUsage | null,
  error: DeepSeekError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) return getLoadingAccessory("DeepSeek");

  if (error) {
    if (error.type === "not_configured") return { text: "Not Configured", tooltip: error.message };
    if (error.type === "unauthorized") return { text: "Key Invalid", tooltip: error.message };
    if (error.type === "network_error") return { text: "Network Error", tooltip: error.message };
    if (error.type === "parse_error") return { text: "Parse Error", tooltip: error.message };
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) return getNoDataAccessory();

  const total = formatBalance(usage.totalBalance, usage.currency);
  return {
    icon: Icon.Coins,
    text: total,
    tooltip: usage.isAvailable
      ? `Balance: ${total} (topped up ${formatBalance(usage.toppedUpBalance, usage.currency)}, granted ${formatBalance(usage.grantedBalance, usage.currency)})`
      : `Balance: ${total} — unavailable for API calls`,
  };
}
