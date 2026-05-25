import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
import { ActivityItemDetail } from "./components/ActivityItemDetail";
import { DashboardDetail } from "./components/DashboardDetail";
import { TransactionsDetail } from "./components/TransactionsDetail";
import { TransactionsView } from "./components/TransactionsView";
import { classifyDirection, parseAmount, stripHtml } from "./lib/classify";
import { formatMoney, relativeTime } from "./lib/format";
import { clearCooldown, getCooldownUntil } from "./lib/rate-limit";
import { inferPrimaryCurrency } from "./lib/summarize";
import { useDashboard } from "./lib/useDashboard";

export default function Dashboard() {
  const { data: snapshot, isLoading, revalidate, error, prefs } = useDashboard();

  if (!isLoading && !snapshot && error) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Couldn't load Wise"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const summaryCurrency = snapshot
    ? prefs.displayCurrency || inferPrimaryCurrency(snapshot.activities)
    : prefs.displayCurrency || "EUR";

  const recent = snapshot?.summary.recent ?? [];

  const cooldownUntil = getCooldownUntil();
  const cooldownMinutes = cooldownUntil ? Math.max(1, Math.round((cooldownUntil - Date.now()) / 60000)) : 0;

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={revalidate}
    />
  );

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Search…"
      navigationTitle={
        snapshot
          ? snapshot.stale
            ? "Wise Lens (cached)"
            : `Wise Lens · ${relativeTime(snapshot.fetchedAt)}`
          : "Wise Lens"
      }
    >
      {snapshot && (
        <List.Section title="Views">
          <List.Item
            icon={{ source: Icon.BankNote, tintColor: Color.Green }}
            title="Dashboard"
            subtitle={
              snapshot.total ? formatMoney(snapshot.total.value, snapshot.total.currency, prefs.locale) : undefined
            }
            detail={
              <DashboardDetail
                snapshot={snapshot}
                locale={prefs.locale}
                summaryCurrency={summaryCurrency}
                hideZeroBalances={prefs.hideZeroBalances}
              />
            }
            actions={
              <ActionPanel>
                {refreshAction}
                {snapshot.total && (
                  <Action.CopyToClipboard
                    title="Copy Total"
                    content={formatMoney(snapshot.total.value, snapshot.total.currency, prefs.locale)}
                  />
                )}
                <Action.OpenInBrowser title="Open Wise.com" url="https://wise.com/all-transactions" />
                <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
          <List.Item
            icon={{ source: Icon.List, tintColor: Color.Blue }}
            title="Transactions"
            subtitle={`${snapshot.activities.length} transactions`}
            detail={<TransactionsDetail snapshot={snapshot} locale={prefs.locale} summaryCurrency={summaryCurrency} />}
            actions={
              <ActionPanel>
                <Action.Push title="Open Transactions" icon={Icon.List} target={<TransactionsView />} />
                {refreshAction}
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {cooldownUntil && (
        <List.Section title="Rate Limit">
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Red }}
            title={`Cooldown active (~${cooldownMinutes} min)`}
            subtitle="Wise returned 429. Showing cache."
            actions={
              <ActionPanel>
                <Action
                  title="Clear Cooldown and Retry"
                  icon={Icon.XMarkCircle}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={() => {
                    clearCooldown();
                    revalidate();
                  }}
                />
                <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {snapshot && recent.length > 0 && (
        <List.Section title="Recent Activity" subtitle={`${recent.length}`}>
          {recent.map((a, i) => (
            <List.Item
              key={`${a.createdOn}-${i}`}
              icon={iconFor(a)}
              title={stripHtml(a.title) || a.type}
              subtitle={accessoryAmount(a, prefs.locale)}
              detail={<ActivityItemDetail activity={a} locale={prefs.locale} />}
              actions={
                <ActionPanel>
                  <Action.Push title="Open Transactions" icon={Icon.List} target={<TransactionsView />} />
                  <Action.CopyToClipboard title="Copy Amount" content={accessoryAmount(a, prefs.locale)} />
                  {refreshAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {snapshot && recent.length === 0 && !snapshot.activitiesError && (
        <List.Section title="Recent Activity">
          <List.Item icon={Icon.Receipt} title="No recent activity" />
        </List.Section>
      )}

      {snapshot?.activitiesError && (
        <List.Section title="Recent Activity">
          <List.Item
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            title="Error loading activity"
            subtitle={snapshot.activitiesError}
            actions={
              <ActionPanel>
                <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function iconFor(a: { status: string; type: string }) {
  const direction = classifyDirection(a as Parameters<typeof classifyDirection>[0]);
  if (a.status !== "COMPLETED") return { source: Icon.Clock, tintColor: Color.Yellow };
  if (direction === "in") return { source: Icon.ArrowDownCircle, tintColor: Color.Green };
  if (direction === "out") return { source: Icon.ArrowUpCircle, tintColor: Color.Red };
  return { source: Icon.Circle, tintColor: Color.SecondaryText };
}

function accessoryAmount(a: { primaryAmount: string; description: string; type: string }, locale: string): string {
  const dir = classifyDirection(a as Parameters<typeof classifyDirection>[0]);
  const p = parseAmount(a.primaryAmount);
  const sign = dir === "out" ? "-" : dir === "in" ? "+" : "";
  return p ? `${sign}${formatMoney(p.value, p.currency, locale)}` : a.primaryAmount;
}
