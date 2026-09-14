import { List } from "@raycast/api";

import { formatResetTime, getRemainingPercent } from "../agents/format.ts";
import { toDisplayPercent, type PercentageDisplayMode } from "../agents/percentage-display.ts";
import type { Accessory } from "../agents/types.ts";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  getPercentageDisplayMode,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui.tsx";
import type { SyntheticUsage, SyntheticQuotaBucket, SyntheticError } from "./types.ts";

/** "(42%)" in remaining mode, "(58% used)" in used mode — counts always show remaining/limit. */
function formatPct(remainingPct: number, mode: PercentageDisplayMode): string {
  const pct = Math.round(toDisplayPercent(remainingPct, mode));
  return mode === "used" ? `(${pct}% used)` : `(${pct}%)`;
}

function formatQuotaText(used: number, limit: number, mode: PercentageDisplayMode): string {
  const remaining = limit - used;
  return `${remaining}/${limit} ${formatPct(getRemainingPercent(remaining, limit), mode)}`;
}

function formatQuotaSection(bucket: SyntheticQuotaBucket, name: string, mode: PercentageDisplayMode): string {
  const remaining = bucket.limit - bucket.requests;
  return `${name}: ${remaining}/${bucket.limit} ${formatPct(getRemainingPercent(remaining, bucket.limit), mode)} - Renews: ${formatResetTime(bucket.renewsAt)}`;
}

export function formatSyntheticUsageText(usage: SyntheticUsage | null, error: SyntheticError | null): string {
  const fallback = formatErrorOrNoData("Synthetic", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as SyntheticUsage;

  const mode = getPercentageDisplayMode();
  const subRemaining = u.subscription.limit - u.subscription.requests;
  const subPct = Math.round(getRemainingPercent(subRemaining, u.subscription.limit));
  let text = `Synthetic Usage`;
  text += `\n\nSubscription`;
  text += `\n${generateAsciiBar(toDisplayPercent(subPct, mode))} ${formatQuotaSection(u.subscription, "Remaining", mode)}`;
  text += `\n\nFree Tool Calls`;
  const toolRemaining = u.freeToolCalls.limit - u.freeToolCalls.requests;
  const toolPct = Math.round(getRemainingPercent(toolRemaining, u.freeToolCalls.limit));
  text += `\n${generateAsciiBar(toDisplayPercent(toolPct, mode))} ${formatQuotaSection(u.freeToolCalls, "Remaining", mode)}`;
  text += `\n\nSearch (Hourly)`;
  const searchRemaining = u.search.hourly.limit - u.search.hourly.requests;
  const searchPct = Math.round(getRemainingPercent(searchRemaining, u.search.hourly.limit));
  text += `\n${generateAsciiBar(toDisplayPercent(searchPct, mode))} ${formatQuotaSection(u.search.hourly, "Remaining", mode)}`;
  return text;
}

export function renderSyntheticDetail(usage: SyntheticUsage | null, error: SyntheticError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as SyntheticUsage;

  const mode = getPercentageDisplayMode();
  const subRemaining = u.subscription.limit - u.subscription.requests;
  const subPct = Math.round(getRemainingPercent(subRemaining, u.subscription.limit));
  const toolRemaining = u.freeToolCalls.limit - u.freeToolCalls.requests;
  const toolPct = Math.round(getRemainingPercent(toolRemaining, u.freeToolCalls.limit));
  const searchRemaining = u.search.hourly.limit - u.search.hourly.requests;
  const searchPct = Math.round(getRemainingPercent(searchRemaining, u.search.hourly.limit));

  return (
    <List.Item.Detail.Metadata>
      {/* Subscription Section */}
      <List.Item.Detail.Metadata.Label
        title="Subscription"
        text={`${generateAsciiBar(toDisplayPercent(subPct, mode))} ${formatQuotaText(u.subscription.requests, u.subscription.limit, mode)}`}
      />
      <List.Item.Detail.Metadata.Label title="Renews In" text={formatResetTime(u.subscription.renewsAt)} />

      <List.Item.Detail.Metadata.Separator />

      {/* Free Tool Calls Section */}
      <List.Item.Detail.Metadata.Label
        title="Free Tool Calls"
        text={`${generateAsciiBar(toDisplayPercent(toolPct, mode))} ${formatQuotaText(u.freeToolCalls.requests, u.freeToolCalls.limit, mode)}`}
      />
      <List.Item.Detail.Metadata.Label title="Renews In" text={formatResetTime(u.freeToolCalls.renewsAt)} />

      <List.Item.Detail.Metadata.Separator />

      {/* Search Section */}
      <List.Item.Detail.Metadata.Label
        title="Search (Hourly)"
        text={`${generateAsciiBar(toDisplayPercent(searchPct, mode))} ${formatQuotaText(u.search.hourly.requests, u.search.hourly.limit, mode)}`}
      />
      <List.Item.Detail.Metadata.Label title="Renews In" text={formatResetTime(u.search.hourly.renewsAt)} />
    </List.Item.Detail.Metadata>
  );
}

export function getSyntheticAccessory(
  usage: SyntheticUsage | null,
  error: SyntheticError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) return getLoadingAccessory("Synthetic");

  if (error) {
    if (error.type === "not_configured") return { text: "Not Configured", tooltip: error.message };
    if (error.type === "unauthorized") return { text: "Token Expired", tooltip: error.message };
    if (error.type === "network_error") return { text: "Network Error", tooltip: error.message };
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) return getNoDataAccessory();

  const mode = getPercentageDisplayMode();
  const remaining = usage.subscription.limit - usage.subscription.requests;
  const pct = Math.round(getRemainingPercent(remaining, usage.subscription.limit));

  return {
    icon: generatePieIcon(pct),
    text: `${Math.round(toDisplayPercent(pct, mode))}%`,
    tooltip: `Subscription: ${usage.subscription.requests}/${usage.subscription.limit} used | Search: ${usage.search.hourly.requests}/${usage.search.hourly.limit} | Free Tools: ${usage.freeToolCalls.requests}/${usage.freeToolCalls.limit}`,
  };
}
