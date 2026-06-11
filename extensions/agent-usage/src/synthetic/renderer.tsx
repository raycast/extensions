import { List } from "@raycast/api";
import { SyntheticUsage, SyntheticQuotaBucket, SyntheticError } from "./types";
import type { Accessory } from "../agents/types";
import { formatResetTime, getRemainingPercent } from "../agents/format";
import {
  renderErrorOrNoData,
  formatErrorOrNoData,
  getLoadingAccessory,
  getNoDataAccessory,
  generatePieIcon,
  generateAsciiBar,
} from "../agents/ui";

function formatQuotaText(used: number, limit: number): string {
  const remaining = limit - used;
  const pct = Math.round(getRemainingPercent(remaining, limit));
  return `${remaining}/${limit} (${pct}%)`;
}

function formatQuotaSection(bucket: SyntheticQuotaBucket, name: string): string {
  const remaining = bucket.limit - bucket.requests;
  const pct = Math.round(getRemainingPercent(remaining, bucket.limit));
  return `${name}: ${remaining}/${bucket.limit} (${pct}%) - Renews: ${formatResetTime(bucket.renewsAt)}`;
}

export function formatSyntheticUsageText(usage: SyntheticUsage | null, error: SyntheticError | null): string {
  const fallback = formatErrorOrNoData("Synthetic", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as SyntheticUsage;

  const subRemaining = u.subscription.limit - u.subscription.requests;
  const subPct = Math.round(getRemainingPercent(subRemaining, u.subscription.limit));
  let text = `Synthetic Usage`;
  text += `\n\nSubscription`;
  text += `\n${generateAsciiBar(subPct)} ${formatQuotaSection(u.subscription, "Remaining")}`;
  text += `\n\nFree Tool Calls`;
  const toolRemaining = u.freeToolCalls.limit - u.freeToolCalls.requests;
  const toolPct = Math.round(getRemainingPercent(toolRemaining, u.freeToolCalls.limit));
  text += `\n${generateAsciiBar(toolPct)} ${formatQuotaSection(u.freeToolCalls, "Remaining")}`;
  text += `\n\nSearch (Hourly)`;
  const searchRemaining = u.search.hourly.limit - u.search.hourly.requests;
  const searchPct = Math.round(getRemainingPercent(searchRemaining, u.search.hourly.limit));
  text += `\n${generateAsciiBar(searchPct)} ${formatQuotaSection(u.search.hourly, "Remaining")}`;
  return text;
}

export function renderSyntheticDetail(usage: SyntheticUsage | null, error: SyntheticError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as SyntheticUsage;

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
        text={`${generateAsciiBar(subPct)} ${formatQuotaText(u.subscription.requests, u.subscription.limit)}`}
      />
      <List.Item.Detail.Metadata.Label title="Renews In" text={formatResetTime(u.subscription.renewsAt)} />

      <List.Item.Detail.Metadata.Separator />

      {/* Free Tool Calls Section */}
      <List.Item.Detail.Metadata.Label
        title="Free Tool Calls"
        text={`${generateAsciiBar(toolPct)} ${formatQuotaText(u.freeToolCalls.requests, u.freeToolCalls.limit)}`}
      />
      <List.Item.Detail.Metadata.Label title="Renews In" text={formatResetTime(u.freeToolCalls.renewsAt)} />

      <List.Item.Detail.Metadata.Separator />

      {/* Search Section */}
      <List.Item.Detail.Metadata.Label
        title="Search (Hourly)"
        text={`${generateAsciiBar(searchPct)} ${formatQuotaText(u.search.hourly.requests, u.search.hourly.limit)}`}
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

  const remaining = usage.subscription.limit - usage.subscription.requests;
  const pct = Math.round(getRemainingPercent(remaining, usage.subscription.limit));

  return {
    icon: generatePieIcon(pct),
    text: `${pct}%`,
    tooltip: `Subscription: ${usage.subscription.requests}/${usage.subscription.limit} used | Search: ${usage.search.hourly.requests}/${usage.search.hourly.limit} | Free Tools: ${usage.freeToolCalls.requests}/${usage.freeToolCalls.limit}`,
  };
}
