import {
  Color,
  Icon,
  Keyboard,
  MenuBarExtra,
  launchCommand,
  LaunchType,
  open,
  openExtensionPreferences,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  fetchDailyActivity,
  formatTokens,
  formatUSD,
  getBaseUrl,
  getMonthlyBudget,
  mergeModelBreakdown,
  startOfMonth,
  sumResults,
  toDateString,
} from "./lib/litellm";

const OPEN_USAGE_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "u" },
  Windows: { modifiers: ["ctrl"], key: "u" },
};
const DASHBOARD_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: "d" },
  Windows: { modifiers: ["ctrl"], key: "d" },
};

// Menu-bar action handlers can throw (e.g. a disabled command, a failed open).
// Surface the failure as a toast instead of letting the click silently do nothing.
async function openUsageCommand() {
  try {
    await launchCommand({ name: "usage", type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Could not open Usage" });
  }
}

async function openDashboard() {
  try {
    await open(`${getBaseUrl()}/ui`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not open dashboard" });
  }
}

async function openPreferences() {
  try {
    await openExtensionPreferences();
  } catch (error) {
    await showFailureToast(error, { title: "Could not open preferences" });
  }
}

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
  const models = mergeModelBreakdown(results);

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
              subtitle={`${formatUSD(m.spend)} · ${formatTokens(m.totalTokens)}`}
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
