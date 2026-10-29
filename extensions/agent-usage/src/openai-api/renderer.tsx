import { Icon, List } from "@raycast/api";

import { formatResetTime } from "../agents/format.ts";
import type { Accessory } from "../agents/types.ts";
import { formatErrorOrNoData, getLoadingAccessory, getNoDataAccessory, renderErrorOrNoData } from "../agents/ui.tsx";
import type { OpenAIApiError, OpenAIApiUsage } from "./types.ts";

function formatCredits(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatExpiringGrant(usage: OpenAIApiUsage): string | null {
  const grant = usage.nextExpiringGrant;
  if (!grant) return null;
  return `${formatCredits(grant.remaining)} expires in ${formatResetTime(grant.expiresAt)}`;
}

export function formatOpenAIApiUsageText(usage: OpenAIApiUsage | null, error: OpenAIApiError | null): string {
  const fallback = formatErrorOrNoData("OpenAI API", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as OpenAIApiUsage;

  const lines = [
    "OpenAI API Usage",
    `Credit Balance: ${formatCredits(u.totalAvailable)}`,
    `Credits Granted: ${formatCredits(u.totalGranted)}`,
    `Used: ${formatCredits(u.totalUsed)}`,
  ];
  const expiring = formatExpiringGrant(u);
  if (expiring) lines.push(`Expiring: ${expiring}`);
  return lines.join("\n");
}

export function renderOpenAIApiDetail(usage: OpenAIApiUsage | null, error: OpenAIApiError | null): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as OpenAIApiUsage;
  const grant = u.nextExpiringGrant;

  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Credit Balance" text={formatCredits(u.totalAvailable)} />
      <List.Item.Detail.Metadata.Label title="Credits Granted" text={formatCredits(u.totalGranted)} />
      <List.Item.Detail.Metadata.Label title="Used" text={formatCredits(u.totalUsed)} />
      {grant && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Next Expiring Grant" text={formatCredits(grant.remaining)} />
          <List.Item.Detail.Metadata.Label title="Expires In" text={formatResetTime(grant.expiresAt)} />
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

export function getOpenAIApiAccessory(
  usage: OpenAIApiUsage | null,
  error: OpenAIApiError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) return getLoadingAccessory("OpenAI API");

  if (error) {
    if (error.type === "not_configured") return { text: "Not Configured", tooltip: error.message };
    if (error.type === "unauthorized") return { text: "Session Expired", tooltip: error.message };
    if (error.type === "network_error") return { text: "Network Error", tooltip: error.message };
    if (error.type === "parse_error") return { text: "Parse Error", tooltip: error.message };
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) return getNoDataAccessory();

  const remaining = formatCredits(usage.totalAvailable);
  const expiring = formatExpiringGrant(usage);
  return {
    icon: Icon.Coins,
    text: remaining,
    tooltip: `API credits: ${remaining} remaining of ${formatCredits(usage.totalGranted)} (${formatCredits(usage.totalUsed)} used)${expiring ? ` | ${expiring}` : ""}`,
  };
}
