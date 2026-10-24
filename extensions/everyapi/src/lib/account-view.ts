import type { AccountSummary } from "./api";
import { ApiError } from "./http";

export function formatQuotaUsd(quota: number, quotaPerUnit: number): string {
  const value = quotaPerUnit > 0 ? quota / quotaPerUnit : 0;
  if (value === 0) return "$0.00";
  if (value < 0.0001) return `$${value.toExponential(2)}`;
  if (value < 1) return `$${value.toFixed(4)}`;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRequests(requests: number): string {
  return requests.toLocaleString("en-US");
}

export interface AccountView {
  username: string;
  displayName: string;
  avatarUrl?: string;
  balance: string;
  todaySpend: string;
  todayRequests: number;
  weekSpend: string;
  weekRequests: number;
  topModels: Array<{ model: string; requests: number; spend: string }>;
  expiresAt: number;
  timezone: string;
}

export interface AccountListRow {
  id: string;
  title: string;
  value: string;
  subtitle: string;
}

export interface AccountListSection {
  title: string;
  rows: AccountListRow[];
}

export function mapAccountSummary(
  response: AccountSummary,
  quotaPerUnit: number,
): AccountView {
  const { data } = response;
  return {
    username: data.username,
    displayName: data.display_name || data.username,
    avatarUrl: data.avatar_url,
    balance: formatQuotaUsd(data.wallet.quota, quotaPerUnit),
    todaySpend: formatQuotaUsd(data.usage.today.quota, quotaPerUnit),
    todayRequests: data.usage.today.requests,
    weekSpend: formatQuotaUsd(data.usage.last_7_days.quota, quotaPerUnit),
    weekRequests: data.usage.last_7_days.requests,
    topModels: data.usage.top_models.map((item) => ({
      model: item.model,
      requests: item.requests,
      spend: formatQuotaUsd(item.quota, quotaPerUnit),
    })),
    expiresAt: data.oauth_token.expires_at,
    timezone: "UTC",
  };
}

export function accountListSections(view: AccountView): AccountListSection[] {
  const sections: AccountListSection[] = [
    {
      title: "Overview",
      rows: [
        {
          id: "balance",
          title: "Available Balance",
          value: view.balance,
          subtitle: view.displayName,
        },
        {
          id: "today",
          title: "Today",
          value: view.todaySpend,
          subtitle: `${formatRequests(view.todayRequests)} request${view.todayRequests === 1 ? "" : "s"}`,
        },
        {
          id: "week",
          title: "Last 7 Days",
          value: view.weekSpend,
          subtitle: `${formatRequests(view.weekRequests)} request${view.weekRequests === 1 ? "" : "s"}`,
        },
      ],
    },
  ];
  if (view.topModels.length > 0) {
    sections.push({
      title: "Top Models · Last 7 Days",
      rows: view.topModels.map((item) => ({
        id: `model:${item.model}`,
        title: item.model,
        value: item.spend,
        subtitle: `${formatRequests(item.requests)} request${item.requests === 1 ? "" : "s"}`,
      })),
    });
  }
  return sections;
}

export function accountMarkdown(view: AccountView): string {
  const lines = [
    `# ${view.balance}`,
    "",
    `Available in **${view.displayName}**'s EveryAPI wallet.`,
    "",
    "### Usage",
    "",
    `- Today: **${view.todaySpend}** · ${formatRequests(view.todayRequests)} request${view.todayRequests === 1 ? "" : "s"}`,
    `- Last 7 days: **${view.weekSpend}** · ${formatRequests(view.weekRequests)} request${view.weekRequests === 1 ? "" : "s"}`,
  ];
  if (view.topModels.length === 0) {
    lines.push("", "_No requests in the last 7 days._");
  } else {
    lines.push("", "### Top models", "");
    for (const item of view.topModels) {
      lines.push(
        `- **${item.model}** · ${formatRequests(item.requests)} request${item.requests === 1 ? "" : "s"} · ${item.spend}`,
      );
    }
  }
  return lines.join("\n");
}

export function accountErrorMarkdown(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return [
      "# Gateway Update Required",
      "",
      "This EveryAPI gateway does not provide the account summary endpoint yet.",
      "",
      "AI commands remain available. Open the EveryAPI dashboard to view wallet and usage data until the gateway is updated.",
    ].join("\n");
  }
  return [
    "# Account Summary Unavailable",
    "",
    error instanceof Error
      ? error.message
      : "The account summary could not be loaded.",
    "",
    "Retry the request or open the EveryAPI dashboard.",
  ].join("\n");
}
