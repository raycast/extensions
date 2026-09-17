import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { ACTIVITY_WINDOW_DAYS } from "./lib/data";
import { useActivities } from "./lib/hooks";
import { usePrivacy } from "./lib/privacy";
import { activityDate, ActivityFilter, filterActivities, sortActivitiesDesc } from "./lib/portfolio";
import { formatDate, formatMoney, formatSigned, formatUnits, mask } from "./lib/format";
import type { Activity } from "./lib/types";
import { NavigationActions, PrivacyAction, RefreshAction } from "./components/actions";
import { classifyError, ListEmpty } from "./components/empty";

const FILTERS: { value: ActivityFilter; title: string }[] = [
  { value: "all", title: "All" },
  { value: "trades", title: "Trades" },
  { value: "dividends", title: "Dividends" },
  { value: "deposits", title: "Deposits" },
];

function iconFor(type: string): { source: Icon; tintColor: Color } {
  switch (type) {
    case "BUY":
    case "REI":
      return { source: Icon.ArrowDownCircle, tintColor: Color.Blue };
    case "SELL":
      return { source: Icon.ArrowUpCircle, tintColor: Color.Orange };
    case "DIVIDEND":
    case "SUBSTITUTE_DIVIDEND":
    case "STOCK_DIVIDEND":
    case "INTEREST":
      return { source: Icon.Coins, tintColor: Color.Green };
    case "CONTRIBUTION":
    case "EXTERNAL_ASSET_TRANSFER_IN":
      return { source: Icon.Plus, tintColor: Color.Green };
    case "WITHDRAWAL":
    case "EXTERNAL_ASSET_TRANSFER_OUT":
      return { source: Icon.Minus, tintColor: Color.Red };
    case "FEE":
    case "TAX":
      return { source: Icon.Receipt, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.Dot, tintColor: Color.SecondaryText };
  }
}

function monthKey(a: Activity): string {
  const d = activityDate(a);
  return d ? d.toLocaleDateString("en-US", { year: "numeric", month: "long" }) : "Undated";
}

function titleFor(a: Activity): string {
  const type = (a.type ?? "").toUpperCase();
  const sym = a.symbol?.symbol ?? a.option_symbol?.ticker;
  const human = type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, " ");
  return sym ? `${human} ${sym}` : human;
}

export default function ShowActivities() {
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const { activities, isLoading, error, refresh } = useActivities(ACTIVITY_WINDOW_DAYS);
  const { privacy, ready, toggle } = usePrivacy();
  const visible = sortActivitiesDesc(filterActivities(activities ?? [], filter));
  const sections = new Map<string, Activity[]>();
  for (const a of visible) {
    const k = monthKey(a);
    sections.set(k, [...(sections.get(k) ?? []), a]);
  }

  return (
    <List
      isLoading={isLoading || !ready}
      searchBarPlaceholder="Search activities…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(v) => setFilter(v as ActivityFilter)}>
          {FILTERS.map((f) => (
            <List.Dropdown.Item key={f.value} title={f.title} value={f.value} />
          ))}
        </List.Dropdown>
      }
    >
      {error && !activities ? (
        <ListEmpty kind={classifyError(error)} error={error} onRetry={refresh} />
      ) : !isLoading && visible.length === 0 ? (
        <ListEmpty kind="no-data" onRetry={refresh} />
      ) : (
        [...sections.entries()].map(([month, items]) => (
          <List.Section key={month} title={month} subtitle={`${items.length}`}>
            {items.map((a, i) => {
              const code = a.currency?.code;
              const amount = mask(formatSigned(a.amount, code), privacy);
              return (
                <List.Item
                  key={a.id ?? `${month}-${i}`}
                  icon={iconFor((a.type ?? "").toUpperCase())}
                  title={titleFor(a)}
                  subtitle={a.description}
                  keywords={[a.type ?? "", a.symbol?.raw_symbol ?? "", a.institution ?? "", a.account?.name ?? ""]}
                  accessories={[
                    { tag: `${a.institution ?? ""}${a.account?.name ? ` · ${a.account.name}` : ""}` },
                    ...(a.units && a.price
                      ? [{ text: `${mask(formatUnits(a.units), privacy)} @ ${formatMoney(a.price, code)}` }]
                      : []),
                    { text: { value: amount, color: (a.amount ?? 0) >= 0 ? Color.Green : Color.PrimaryText } },
                    { date: activityDate(a) ?? undefined, tooltip: formatDate(a.trade_date) },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Activity"
                        content={`${formatDate(a.trade_date)} · ${titleFor(a)} · ${formatSigned(a.amount, code)} ${code ?? ""}`}
                      />
                      <PrivacyAction privacy={privacy} onToggle={toggle} />
                      <RefreshAction onRefresh={refresh} />
                      <NavigationActions />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}
