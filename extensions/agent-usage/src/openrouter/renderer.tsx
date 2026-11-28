import { Icon, List } from "@raycast/api";

import type { Accessory } from "../agents/types.ts";
import { formatErrorOrNoData, getLoadingAccessory, getNoDataAccessory, renderErrorOrNoData } from "../agents/ui.tsx";
import type { OpenRouterError, OpenRouterUsage } from "./types.ts";

function formatCredits(value: number): string {
  return `$${value.toFixed(2)}`;
}

function getScopeLabel(usage: OpenRouterUsage): string {
  return usage.source === "account" ? "Account credits" : `Key limit${usage.label ? ` — ${usage.label}` : ""}`;
}

function getTotalLabel(usage: OpenRouterUsage): string {
  return usage.source === "account" ? "Credits Purchased" : "Key Limit";
}

export function formatOpenRouterUsageText(usage: OpenRouterUsage | null, error: OpenRouterError | null): string {
  const fallback = formatErrorOrNoData("OpenRouter", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as OpenRouterUsage;

  return [
    "OpenRouter Usage",
    `Scope: ${getScopeLabel(u)}`,
    `Remaining: ${u.remaining === null ? "No spending cap" : formatCredits(u.remaining)}`,
    `${getTotalLabel(u)}: ${u.totalCredits === null ? "Unlimited" : formatCredits(u.totalCredits)}`,
    `Used: ${formatCredits(u.totalUsage)}`,
  ].join("\n");
}

export function renderOpenRouterDetail(usage: OpenRouterUsage | null, error: OpenRouterError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as OpenRouterUsage;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Scope" text={getScopeLabel(u)} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Credits Remaining"
        text={u.remaining === null ? "No spending cap" : formatCredits(u.remaining)}
      />
      <List.Item.Detail.Metadata.Label
        title={getTotalLabel(u)}
        text={u.totalCredits === null ? "Unlimited" : formatCredits(u.totalCredits)}
      />
      <List.Item.Detail.Metadata.Label title="Used" text={formatCredits(u.totalUsage)} />
      {u.isFreeTier !== undefined ? (
        <List.Item.Detail.Metadata.Label title="Tier" text={u.isFreeTier ? "Free" : "Paid"} />
      ) : null}
    </List.Item.Detail.Metadata>
  );
}

export function getOpenRouterAccessory(
  usage: OpenRouterUsage | null,
  error: OpenRouterError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) return getLoadingAccessory("OpenRouter");

  if (error) {
    if (error.type === "not_configured") return { text: "Not Configured", tooltip: error.message };
    if (error.type === "unauthorized") return { text: "Key Invalid", tooltip: error.message };
    if (error.type === "network_error") return { text: "Network Error", tooltip: error.message };
    if (error.type === "parse_error") return { text: "Parse Error", tooltip: error.message };
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) return getNoDataAccessory();

  const used = formatCredits(usage.totalUsage);
  if (usage.remaining === null) {
    return {
      icon: Icon.Coins,
      text: `${used} used`,
      tooltip: `${getScopeLabel(usage)}: no spending cap, ${used} used`,
    };
  }

  const remaining = formatCredits(usage.remaining);
  const total = usage.totalCredits === null ? null : formatCredits(usage.totalCredits);
  return {
    icon: Icon.Coins,
    text: remaining,
    tooltip: total
      ? `${getScopeLabel(usage)}: ${remaining} remaining of ${total} (${used} used)`
      : `${getScopeLabel(usage)}: ${remaining} remaining (${used} used)`,
  };
}
