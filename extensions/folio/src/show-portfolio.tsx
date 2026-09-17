import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { usePortfolio } from "./lib/hooks";
import { usePrivacy } from "./lib/privacy";
import { dayChange, flattenPositions, groupByInstitution, netWorth, withWeights } from "./lib/portfolio";
import { formatDate, formatMoney, formatMoneyWithCode, formatSigned, mask } from "./lib/format";
import type { AccountSnapshot } from "./lib/types";
import { NavigationActions, PrivacyAction, RefreshAction, TradeStubAction } from "./components/actions";
import { classifyError, ListEmpty } from "./components/empty";
import { PositionItem } from "./components/PositionItem";

export default function ShowPortfolio() {
  const { snapshot, isLoading, error, refresh } = usePortfolio();
  const { privacy, ready, toggle } = usePrivacy();
  const { push } = useNavigation();

  const accounts = snapshot?.accounts ?? [];
  const nw = netWorth(accounts.map((a) => a.account));
  const change = dayChange(accounts);
  const groups = groupByInstitution(accounts);
  const commonActions = (
    <>
      <PrivacyAction privacy={privacy} onToggle={toggle} />
      <RefreshAction onRefresh={refresh} />
    </>
  );

  return (
    <List isLoading={isLoading || !ready} searchBarPlaceholder="Search accounts…">
      {error && accounts.length === 0 ? (
        <ListEmpty kind={classifyError(error)} error={error} onRetry={refresh} />
      ) : !isLoading && accounts.length === 0 ? (
        <ListEmpty kind="connect" onRetry={refresh} />
      ) : (
        <>
          <List.Section title="Net Worth">
            {nw.byCurrency.map((t, i) => (
              <List.Item
                key={t.currency}
                icon={{ source: Icon.Coins, tintColor: i === 0 ? Color.Blue : Color.SecondaryText }}
                title={mask(formatMoneyWithCode(t.amount, t.currency), privacy)}
                subtitle={i === 0 ? `${nw.accountCount} account${nw.accountCount === 1 ? "" : "s"}` : undefined}
                accessories={(() => {
                  const c = change?.find((x) => x.currency === t.currency);
                  return c
                    ? [
                        {
                          tag: {
                            value: mask(formatSigned(c.amount, c.currency), privacy),
                            color: c.amount >= 0 ? Color.Green : Color.Red,
                          },
                          tooltip: "Change vs previous day (SnapTrade balance history)",
                        },
                      ]
                    : [];
                })()}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Net Worth"
                      content={`Net worth: ${nw.byCurrency.map((x) => formatMoneyWithCode(x.amount, x.currency)).join(" · ")}`}
                    />
                    {commonActions}
                    <NavigationActions />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          {groups.map((g) => (
            <List.Section
              key={g.institution}
              title={g.institution}
              subtitle={`${g.items.length} account${g.items.length === 1 ? "" : "s"}`}
            >
              {g.items.map((s) => (
                <AccountRow
                  key={s.account.id}
                  snapshot={s}
                  privacy={privacy}
                  onOpen={() => push(<AccountHoldings snapshot={s} />)}
                  actions={commonActions}
                />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

function AccountRow({
  snapshot: s,
  privacy,
  onOpen,
  actions,
}: {
  snapshot: AccountSnapshot;
  privacy: boolean;
  onOpen: () => void;
  actions: React.ReactNode;
}) {
  const total = s.account.balance.total;
  const cash = (s.holdings.balances ?? []).filter((b) => typeof b.cash === "number");
  const positions = (s.holdings.positions ?? []).length + (s.holdings.option_positions ?? []).length;
  const synced = s.account.sync_status?.holdings?.last_successful_sync;
  const accessories: List.Item.Accessory[] = [];
  if (cash.length > 0) {
    accessories.push({
      tag: {
        value: mask(cash.map((b) => formatMoney(b.cash, b.currency?.code)).join(" · "), privacy),
        color: Color.SecondaryText,
      },
      tooltip: "Cash",
    });
  }
  if (s.dayChange) {
    accessories.push({
      tag: {
        value: mask(formatSigned(s.dayChange.amount, s.dayChange.currency), privacy),
        color: s.dayChange.amount >= 0 ? Color.Green : Color.Red,
      },
      tooltip: `Day change as of ${formatDate(s.dayChange.asOf)}`,
    });
  }
  if (total?.amount !== undefined)
    accessories.push({
      text: mask(formatMoneyWithCode(total.amount, total.currency), privacy),
      tooltip: "Account total",
    });
  return (
    <List.Item
      id={s.account.id}
      icon={{ source: Icon.Wallet, tintColor: Color.Blue }}
      title={s.account.name ?? s.account.number}
      subtitle={[s.account.raw_type, s.account.number, `${positions} position${positions === 1 ? "" : "s"}`]
        .filter(Boolean)
        .join(" · ")}
      keywords={[s.account.institution_name, s.account.raw_type ?? ""]}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action title="Show Holdings" icon={Icon.List} onAction={onOpen} />
          <Action.CopyToClipboard
            title="Copy Account Total"
            content={formatMoneyWithCode(total?.amount, total?.currency)}
          />
          {synced ? <Action.CopyToClipboard title="Copy Last Sync Time" content={synced} /> : null}
          <ActionPanel.Section>{actions}</ActionPanel.Section>
          <NavigationActions />
        </ActionPanel>
      }
    />
  );
}

function AccountHoldings({ snapshot }: { snapshot: AccountSnapshot }) {
  const { privacy, toggle } = usePrivacy();
  const { refresh } = usePortfolio();
  const [showDetail, setShowDetail] = useState(false);
  const positions = withWeights(flattenPositions([snapshot]));
  const cash = (snapshot.holdings.balances ?? []).filter((b) => typeof b.cash === "number");
  const title = `${snapshot.account.institution_name} · ${snapshot.account.name ?? snapshot.account.number}`;
  return (
    <List
      navigationTitle={title}
      isShowingDetail={showDetail}
      searchBarPlaceholder={`Search ${snapshot.account.name ?? "holdings"}…`}
    >
      {cash.length > 0 && (
        <List.Section title="Cash">
          {cash.map((b) => (
            <List.Item
              key={b.currency?.code ?? "cash"}
              icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
              title={`Cash ${b.currency?.code ?? ""}`.trim()}
              accessories={[
                ...(typeof b.buying_power === "number" && b.buying_power !== b.cash
                  ? [
                      {
                        text: `BP ${mask(formatMoney(b.buying_power, b.currency?.code), privacy)}`,
                        tooltip: "Buying power",
                      },
                    ]
                  : []),
                { text: mask(formatMoney(b.cash, b.currency?.code), privacy) },
              ]}
              actions={
                <ActionPanel>
                  <PrivacyAction privacy={privacy} onToggle={toggle} />
                  <RefreshAction onRefresh={refresh} />
                  <TradeStubAction />
                  <NavigationActions />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Positions" subtitle={`${positions.length}`}>
        {positions.map((p) => (
          <PositionItem
            key={p.key}
            position={p}
            privacy={privacy}
            showDetail={showDetail}
            onToggleDetail={() => setShowDetail((v) => !v)}
            onTogglePrivacy={toggle}
            onRefresh={refresh}
            hideAccount
          />
        ))}
      </List.Section>
      {positions.length === 0 && cash.length === 0 && <ListEmpty kind="no-data" onRetry={refresh} />}
    </List>
  );
}
