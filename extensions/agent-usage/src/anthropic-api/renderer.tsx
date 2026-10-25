import { Icon, List } from "@raycast/api";

import { formatResetTime } from "../agents/format.ts";
import type { Accessory } from "../agents/types.ts";
import { formatErrorOrNoData, getLoadingAccessory, getNoDataAccessory, renderErrorOrNoData } from "../agents/ui.tsx";
import type { AnthropicApiError, AnthropicApiUsage } from "./types.ts";

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

function formatExpiringGrant(usage: AnthropicApiUsage): string | null {
  const grant = usage.nextExpiringGrant;
  if (!grant) return null;
  return `${formatMoney(grant.remaining, usage.currency)} ${grant.name} expires in ${formatResetTime(grant.expiresAt)}`;
}

export function formatAnthropicApiUsageText(usage: AnthropicApiUsage | null, error: AnthropicApiError | null): string {
  const fallback = formatErrorOrNoData("Claude API", usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AnthropicApiUsage;

  const lines = ["Claude API Usage"];
  if (u.organizationName) lines.push(`Organization: ${u.organizationName}`);
  lines.push(`Credit Balance: ${formatMoney(u.balance, u.currency)}`);
  if (u.monthToDateSpend !== null) lines.push(`Spent This Month (UTC): ${formatMoney(u.monthToDateSpend, u.currency)}`);
  const expiring = formatExpiringGrant(u);
  if (expiring) lines.push(`Expiring: ${expiring}`);
  return lines.join("\n");
}

export function renderAnthropicApiDetail(
  usage: AnthropicApiUsage | null,
  error: AnthropicApiError | null,
): React.ReactNode {
  const fallback = renderErrorOrNoData(usage, error);
  if (fallback !== null) return fallback;
  const u = usage as AnthropicApiUsage;
  const grant = u.nextExpiringGrant;

  return (
    <List.Item.Detail.Metadata>
      {u.organizationName && (
        <>
          <List.Item.Detail.Metadata.Label title="Organization" text={u.organizationName} />
          <List.Item.Detail.Metadata.Separator />
        </>
      )}
      <List.Item.Detail.Metadata.Label title="Credit Balance" text={formatMoney(u.balance, u.currency)} />
      <List.Item.Detail.Metadata.Label
        title="Spent This Month (UTC)"
        text={u.monthToDateSpend === null ? "Unavailable" : formatMoney(u.monthToDateSpend, u.currency)}
      />
      {grant && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={grant.name} text={formatMoney(grant.remaining, u.currency)} />
          <List.Item.Detail.Metadata.Label title="Expires In" text={formatResetTime(grant.expiresAt)} />
        </>
      )}
    </List.Item.Detail.Metadata>
  );
}

export function getAnthropicApiAccessory(
  usage: AnthropicApiUsage | null,
  error: AnthropicApiError | null,
  isLoading: boolean,
): Accessory {
  if (isLoading) return getLoadingAccessory("Claude API");

  if (error) {
    if (error.type === "not_configured") return { text: "Not Configured", tooltip: error.message };
    if (error.type === "unauthorized") return { text: "Session Expired", tooltip: error.message };
    if (error.type === "network_error") return { text: "Network Error", tooltip: error.message };
    if (error.type === "parse_error") return { text: "Parse Error", tooltip: error.message };
    return { text: "Error", tooltip: error.message };
  }

  if (!usage) return getNoDataAccessory();

  const balance = formatMoney(usage.balance, usage.currency);
  const organization = usage.organizationName ? `${usage.organizationName}: ` : "";
  const spend =
    usage.monthToDateSpend === null ? "" : ` | ${formatMoney(usage.monthToDateSpend, usage.currency)} spent this month`;
  const expiring = formatExpiringGrant(usage);
  return {
    icon: Icon.Coins,
    text: balance,
    tooltip: `${organization}${balance} API credit balance${spend}${expiring ? ` | ${expiring}` : ""}`,
  };
}
