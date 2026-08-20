import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import {
  daysAgo,
  fetchDailyActivity,
  fetchKeyInfoCached,
  formatTokens,
  formatUSD,
  getBaseUrl,
  getMonthlyBudget,
  KeyInfo,
  mergeModelBreakdown,
  startOfMonth,
  sumResults,
  toDateString,
  UsageTotals,
} from "./lib/litellm";

const DASHBOARD_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "d" },
  Windows: { modifiers: ["ctrl"], key: "d" },
};
const SHARE_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "s" },
  Windows: { modifiers: ["ctrl", "shift"], key: "s" },
};

const MODEL_COLORS = [Color.Purple, Color.Blue, Color.Magenta, Color.Orange, Color.Green, Color.Yellow];

/** Open extension preferences, surfacing any failure as a toast instead of silently doing nothing. */
async function openPreferences() {
  try {
    await openExtensionPreferences();
  } catch (error) {
    await showFailureToast(error, { title: "Could not open preferences" });
  }
}

function formatResetDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Grey at $0, green up to $100, orange up to $1000, red beyond. */
function amountColor(amount: number): Color {
  if (amount <= 0) return Color.SecondaryText;
  if (amount <= 100) return Color.Green;
  if (amount < 1000) return Color.Orange;
  return Color.Red;
}

/** Green under 70% of budget, orange under 90%, red at/over 90%. */
function budgetColor(spend: number, maxBudget?: number | null): Color {
  if (maxBudget == null || maxBudget <= 0) return Color.PrimaryText;
  const ratio = spend / maxBudget;
  if (ratio >= 0.9) return Color.Red;
  if (ratio >= 0.7) return Color.Orange;
  return Color.Green;
}

interface UsageData {
  totalsToday: UsageTotals;
  totals7d: UsageTotals;
  totals30d: UsageTotals;
  totalsMonth: UsageTotals;
  models: Array<{ model: string } & UsageTotals>;
  keyInfo: KeyInfo | null;
}

function usageLine(label: string, totals: UsageTotals): string {
  return `${label}: ${formatUSD(totals.spend)} · ${formatTokens(totals.totalTokens)} tokens · ${totals.apiRequests} reqs`;
}

/** Plain-text, paste-friendly usage summary for sharing. */
function buildShareText(data: UsageData, monthlyBudget?: number): string {
  const monthSuffix =
    monthlyBudget != null
      ? ` (${Math.round((data.totalsMonth.spend / monthlyBudget) * 100)}% of ${formatUSD(monthlyBudget)})`
      : "";

  const lines = [
    "🚅 LiteLLM Usage",
    "",
    usageLine("Today", data.totalsToday),
    usageLine("Last 7 days", data.totals7d),
    usageLine("This month", data.totalsMonth) + monthSuffix,
  ];

  // Skip models with no spend or no requests — they only add noise to a shared summary.
  const models = data.models.filter((m) => m.spend > 0 && m.apiRequests > 0);
  if (models.length > 0) {
    lines.push("", "By model (30 days):");
    for (const m of models) {
      lines.push(
        `  • ${m.model}: ${formatUSD(m.spend)} · ${formatTokens(m.totalTokens)} tokens · ${m.apiRequests} reqs`,
      );
    }
  }

  return lines.join("\n");
}

function ShareUsageDetail({ text }: { text: string }) {
  return (
    <Detail
      navigationTitle="Share Usage"
      markdown={"```\n" + text + "\n```"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Usage" content={text} />
          <Action.Paste title="Paste Usage" content={text} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  // Refresh forces a key-info refetch; normal opens use the 1h TTL cache.
  const forceKeyInfo = useRef(false);

  const { data, isLoading, error, revalidate } = useCachedPromise(async () => {
    const today = new Date();
    const monthStart = startOfMonth();
    // Fetch far enough back to cover both the 30-day trend and the calendar month.
    const startDate = toDateString(monthStart < daysAgo(29) ? monthStart : daysAgo(29));
    const endDate = toDateString(today);

    const activity = await fetchDailyActivity(startDate, endDate);
    // /key/info is best-effort and rarely changes — cached for 1h unless refreshed.
    const keyInfo: KeyInfo | null = await fetchKeyInfoCached(forceKeyInfo.current);
    forceKeyInfo.current = false;

    const results = activity.results ?? [];
    const todayStr = toDateString(today);
    const sevenDaysAgo = toDateString(daysAgo(6));
    const thirtyDaysAgo = toDateString(daysAgo(29));
    const monthStr = toDateString(monthStart);

    const totalsToday = sumResults(results.filter((r) => r.date === todayStr));
    const totals7d = sumResults(results.filter((r) => r.date >= sevenDaysAgo));
    const totals30d = sumResults(results.filter((r) => r.date >= thirtyDaysAgo));
    const totalsMonth = sumResults(results.filter((r) => r.date >= monthStr));
    const models = mergeModelBreakdown(results.filter((r) => r.date >= thirtyDaysAgo));

    return { totalsToday, totals7d, totals30d, totalsMonth, models, keyInfo };
  });

  const monthlyBudget = getMonthlyBudget();

  // Shared actions; pass a value to add a Copy action for that row.
  const actions = (copyValue?: string) => (
    <ActionPanel>
      {copyValue && (
        <Action.CopyToClipboard title="Copy Value" content={copyValue} shortcut={Keyboard.Shortcut.Common.Copy} />
      )}
      {data && (
        <Action.Push
          title="Share Usage"
          icon={Icon.Upload}
          shortcut={SHARE_SHORTCUT}
          target={<ShareUsageDetail text={buildShareText(data, monthlyBudget)} />}
        />
      )}
      <Action.OpenInBrowser title="Open Dashboard" url={`${getBaseUrl()}/ui`} shortcut={DASHBOARD_SHORTCUT} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => {
          forceKeyInfo.current = true;
          revalidate();
        }}
      />
      <Action title="Open Preferences" icon={Icon.Gear} onAction={openPreferences} />
    </ActionPanel>
  );

  if (error) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not load usage"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openPreferences} />
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Pass `budget` to append a "% of budget" to the spend tag (used for This Month).
  const totalRow = (title: string, totals: UsageTotals, budget?: number) => {
    const pct = budget != null ? Math.round((totals.spend / budget) * 100) : undefined;
    const tagValue = pct != null ? `${formatUSD(totals.spend)} · ${pct}%` : formatUSD(totals.spend);
    return (
      <List.Item
        key={title}
        title={title}
        subtitle={`${formatTokens(totals.totalTokens)} tokens · ${totals.apiRequests} reqs`}
        icon={{ source: Icon.Coins, tintColor: amountColor(totals.spend) }}
        accessories={[{ tag: { value: tagValue, color: amountColor(totals.spend) } }]}
        actions={actions(formatUSD(totals.spend))}
      />
    );
  };

  const keyInfo = data?.keyInfo;
  const resetDate = formatResetDate(keyInfo?.budget_reset_at);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Totals">
        {data && totalRow("Today", data.totalsToday)}
        {data && totalRow("Last 7 Days", data.totals7d)}
        {data && totalRow("Last 30 Days", data.totals30d)}
        {data && totalRow("This Month", data.totalsMonth, monthlyBudget)}
      </List.Section>

      <List.Section title="By Model (30 days)">
        {(data?.models ?? []).map((m, i) => (
          <List.Item
            key={m.model}
            title={m.model}
            subtitle={`${formatTokens(m.totalTokens)} tokens · ${m.apiRequests} reqs`}
            icon={{ source: Icon.Dot, tintColor: MODEL_COLORS[i % MODEL_COLORS.length] }}
            accessories={[{ tag: { value: formatUSD(m.spend), color: amountColor(m.spend) } }]}
            actions={actions(formatUSD(m.spend))}
          />
        ))}
      </List.Section>

      {keyInfo && (
        <List.Section title="Key">
          {keyInfo.key_alias && (
            <List.Item
              title="Key"
              subtitle={keyInfo.key_alias}
              icon={{ source: Icon.Key, tintColor: Color.SecondaryText }}
              actions={actions(keyInfo.key_alias)}
            />
          )}
          <List.Item
            title="Spend"
            icon={{ source: Icon.BankNote, tintColor: budgetColor(keyInfo.spend ?? 0, keyInfo.max_budget) }}
            accessories={[
              {
                tag: {
                  value:
                    keyInfo.max_budget != null
                      ? `${formatUSD(keyInfo.spend ?? 0)} / ${formatUSD(keyInfo.max_budget)}`
                      : formatUSD(keyInfo.spend ?? 0),
                  color: budgetColor(keyInfo.spend ?? 0, keyInfo.max_budget),
                },
              },
            ]}
            actions={actions(formatUSD(keyInfo.spend ?? 0))}
          />
          {resetDate && (
            <List.Item
              title="Budget Resets"
              subtitle={resetDate}
              icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
              actions={actions(resetDate)}
            />
          )}
        </List.Section>
      )}
    </List>
  );
}
