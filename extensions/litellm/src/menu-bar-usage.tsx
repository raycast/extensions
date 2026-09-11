import { Color, Icon, Keyboard, MenuBarExtra } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { openDashboard, openPreferences, openUsageCommand } from "./lib/actions";
import { DASHBOARD_SHORTCUT, OPEN_USAGE_SHORTCUT } from "./lib/shortcuts";
import {
  fetchDailyActivity,
  formatTokens,
  formatUSD,
  getMonthlyBudget,
  mergeModelBreakdown,
  startOfMonth,
  sumResults,
  toDateString,
} from "./lib/litellm";

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(async () => {
    // One month-to-date call covers both today's and this month's spend.
    const today = new Date();
    return fetchDailyActivity(toDateString(startOfMonth()), toDateString(today));
  });

  if (error) {
    return (
      <MenuBarExtra icon={{ source: Icon.Warning, tintColor: Color.Red }} title="🚅" tooltip={error.message}>
        <MenuBarExtra.Item title={error.message} />
        <MenuBarExtra.Item title="Open Preferences…" icon={Icon.Gear} onAction={openPreferences} />
      </MenuBarExtra>
    );
  }

  const results = data?.results ?? [];
  const todayStr = toDateString(new Date());
  const todayTotals = sumResults(results.filter((r) => r.date === todayStr));
  const monthTotals = sumResults(results);
  const models = mergeModelBreakdown(results).filter((m) => m.spend > 0 || m.apiRequests > 0);

  const monthlyBudget = getMonthlyBudget();
  const monthPct = monthlyBudget != null ? Math.round((monthTotals.spend / monthlyBudget) * 100) : undefined;

  // Menu bar shows today's cost, plus this month's % of budget when one is set.
  const todayLabel = formatUSD(todayTotals.spend);
  const title = isLoading && !data ? "🚅" : `🚅 ${todayLabel}${monthPct != null ? ` · ${monthPct}%` : ""}`;

  return (
    <MenuBarExtra title={title} tooltip="LiteLLM spend" isLoading={isLoading}>
      <MenuBarExtra.Section title="Today">
        <MenuBarExtra.Item
          title="Spend"
          icon={{ source: Icon.BankNote, tintColor: Color.Green }}
          subtitle={todayLabel}
        />
        <MenuBarExtra.Item
          title="Tokens"
          icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
          subtitle={formatTokens(todayTotals.totalTokens)}
        />
        <MenuBarExtra.Item
          title="Requests"
          icon={{ source: Icon.ArrowNe, tintColor: Color.Blue }}
          subtitle={String(todayTotals.apiRequests)}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="This Month">
        <MenuBarExtra.Item
          title="Spend"
          icon={{ source: Icon.BankNote, tintColor: Color.Green }}
          subtitle={
            monthlyBudget != null
              ? `${formatUSD(monthTotals.spend)} / ${formatUSD(monthlyBudget)} · ${monthPct}%`
              : formatUSD(monthTotals.spend)
          }
        />
      </MenuBarExtra.Section>

      {models.length > 0 && (
        <MenuBarExtra.Section title="By Model (This Month)">
          {models.map((m) => (
            <MenuBarExtra.Item
              key={m.model}
              title={m.model}
              icon={{ source: Icon.Dot, tintColor: Color.Purple }}
              subtitle={`${formatTokens(m.totalTokens)} · ${m.apiRequests} reqs · ${formatUSD(m.spend)}`}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Usage"
          icon={Icon.BarChart}
          shortcut={OPEN_USAGE_SHORTCUT}
          onAction={openUsageCommand}
        />
        <MenuBarExtra.Item
          title="Open Dashboard"
          icon={Icon.Globe}
          shortcut={DASHBOARD_SHORTCUT}
          onAction={openDashboard}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => revalidate()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
