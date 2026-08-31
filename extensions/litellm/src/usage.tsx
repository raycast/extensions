import { Action, ActionPanel, Color, Detail, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { openPreferences } from "./lib/actions";
import { DASHBOARD_SHORTCUT, SHARE_SHORTCUT } from "./lib/shortcuts";
import {
  daysAgo,
  fetchDailyActivity,
  formatTokens,
  formatUSD,
  getBaseUrl,
  getMonthlyBudget,
  mergeModelBreakdown,
  startOfMonth,
  startOfWeek,
  sumResults,
  toDateString,
  UsageTotals,
} from "./lib/litellm";

const MODEL_COLORS = [Color.Purple, Color.Blue, Color.Magenta, Color.Orange, Color.Green, Color.Yellow];

/** Grey at $0, green up to $100, orange up to $1000, red beyond. */
function amountColor(amount: number): Color {
  if (amount <= 0) return Color.SecondaryText;
  if (amount <= 100) return Color.Green;
  if (amount < 1000) return Color.Orange;
  return Color.Red;
}

interface UsageData {
  totalsToday: UsageTotals;
  totals7d: UsageTotals;
  totals30d: UsageTotals;
  totalsMonth: UsageTotals;
  models: Array<{ model: string } & UsageTotals>;
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
  const { data, isLoading, error, revalidate } = useCachedPromise(async () => {
    const today = new Date();
    const monthStart = startOfMonth();
    // Fetch far enough back to cover both the 30-day trend and the calendar month.
    const startDate = toDateString(monthStart < daysAgo(29) ? monthStart : daysAgo(29));
    const endDate = toDateString(today);

    const activity = await fetchDailyActivity(startDate, endDate);

    const results = activity.results ?? [];
    const todayStr = toDateString(today);
    const weekStr = toDateString(startOfWeek());
    const sevenDaysAgo = toDateString(daysAgo(6));
    const thirtyDaysAgo = toDateString(daysAgo(29));
    const monthStr = toDateString(monthStart);

    const totalsToday = sumResults(results.filter((r) => r.date === todayStr));
    const totalsWeek = sumResults(results.filter((r) => r.date >= weekStr));
    const totals7d = sumResults(results.filter((r) => r.date >= sevenDaysAgo));
    const totals30d = sumResults(results.filter((r) => r.date >= thirtyDaysAgo));
    const totalsMonth = sumResults(results.filter((r) => r.date >= monthStr));
    const models = mergeModelBreakdown(results.filter((r) => r.date >= thirtyDaysAgo));

    return { totalsToday, totalsWeek, totals7d, totals30d, totalsMonth, models };
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
        onAction={() => revalidate()}
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

  // Models are sorted by spend desc. If more than 10 models have spend, cap the
  // list at those with spend to keep it short; otherwise show all (incl. zero-spend).
  const allModels = data?.models ?? [];
  const spendModels = allModels.filter((m) => m.spend > 0);
  const visibleModels = spendModels.length > 10 ? spendModels : allModels;

  return (
    <List isLoading={isLoading}>
      <List.Section title="Totals">
        {data && totalRow("Today", data.totalsToday)}
        {data && totalRow("Last 7 Days", data.totals7d)}
        {data && totalRow("Last 30 Days", data.totals30d)}
        {data && totalRow("This Week", data.totalsWeek)}
        {data && totalRow("This Month", data.totalsMonth, monthlyBudget)}
      </List.Section>

      <List.Section title="By Model (30 days)">
        {visibleModels.map((m, i) => (
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
    </List>
  );
}
