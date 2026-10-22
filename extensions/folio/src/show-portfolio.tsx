import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useState } from "react";
import { usePortfolio } from "./lib/hooks";
import { usePrivacy } from "./lib/privacy";
import {
  dayChange,
  flattenPositions,
  groupByInstitution,
  isRecentSnapshot,
  netWorth,
  withWeights,
} from "./lib/portfolio";
import {
  formatAsOf,
  formatMoney,
  formatMoneyWithCode,
  formatSigned,
  formatSnapshotDate,
  formatSnapshotPeriod,
  mask,
} from "./lib/format";
import { oldDataAsOf } from "./lib/snapshot";
import type { AccountSnapshot } from "./lib/types";
import { launch, NavigationActions, PrivacyAction, RefreshAction, TradeStubAction } from "./components/actions";
import { classifyError, ListEmpty } from "./components/empty";
import { PositionItem } from "./components/PositionItem";

export default function ShowPortfolio() {
  const { snapshot, isLoading, error, refresh } = usePortfolio();
  const { privacy, ready, toggle } = usePrivacy();
  const { push } = useNavigation();

  const accounts = snapshot?.accounts ?? [];
  const failures = snapshot?.failures ?? [];
  const nw = netWorth(accounts.map((a) => a.account));
  const change = dayChange(accounts);
  const groups = groupByInstitution(accounts);
  // When the data shown was fetched. After a failed refresh the previous data stays up, so say so.
  // The session ended while older data is still on screen: say so and offer to sign in.
  const signedOutWithData = Boolean(error) && accounts.length > 0 && classifyError(error) === "sign-in";
  const updated = !snapshot
    ? undefined
    : isLoading
      ? `Updating… · showing ${formatAsOf(snapshot.fetchedAt)}`
      : error
        ? `${signedOutWithData ? "Signed out" : "Couldn't refresh"} · showing ${formatAsOf(snapshot.fetchedAt)}`
        : `Updated ${formatAsOf(snapshot.fetchedAt)}`;
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
          {signedOutWithData && (
            <List.Section title="Signed Out">
              <List.Item
                icon={{ source: Icon.Person, tintColor: Color.Orange }}
                title="Sign In with SnapTrade"
                subtitle="Your session ended; the numbers below are from before"
                actions={
                  <ActionPanel>
                    <Action title="Sign in with SnapTrade" icon={Icon.Person} onAction={() => launch("sign-in")} />
                    <NavigationActions />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          <List.Section
            title="Net Worth"
            subtitle={[
              updated,
              // Here, not on a total's row, so it shows even when no account has a balance yet.
              nw.missing ? `${nw.missing} account${nw.missing === 1 ? "" : "s"} without a balance, not included` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            {nw.byCurrency.map((t, i) => (
              <List.Item
                key={t.currency}
                icon={{ source: Icon.Coins, tintColor: i === 0 ? Color.Blue : Color.SecondaryText }}
                title={mask(formatMoneyWithCode(t.amount, t.currency), privacy)}
                subtitle={i === 0 ? `${nw.accountCount} account${nw.accountCount === 1 ? "" : "s"}` : undefined}
                accessories={(() => {
                  const c = change?.find((x) => x.currency === t.currency);
                  if (!c) return [];
                  const period = formatSnapshotPeriod(c);
                  const left = [
                    c.missing ? `${c.missing} have no balance history` : "",
                    c.otherDates ? `${c.otherDates} have snapshots on other dates` : "",
                  ].filter(Boolean);
                  return [
                    {
                      tag: {
                        value: mask(
                          `${formatSigned(c.amount, c.currency)}${c.complete ? "" : " · partial"}${
                            isRecentSnapshot(c.asOf, new Date()) ? "" : ` · ${formatSnapshotDate(c.asOf)}`
                          }`,
                          privacy,
                        ),
                        color: privacy ? Color.SecondaryText : c.amount >= 0 ? Color.Green : Color.Red,
                      },
                      tooltip: c.complete
                        ? `Change ${period} between SnapTrade balance snapshots (includes deposits)`
                        : `Change ${period} for ${c.covered} of ${c.covered + c.missing + c.otherDates} ${c.currency} accounts; ${left.join("; ")}`,
                    },
                  ];
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
                  onOpen={() => push(<AccountHoldings accountId={s.account.id} initial={s} refresh={refresh} />)}
                  actions={commonActions}
                />
              ))}
            </List.Section>
          ))}
          {failures.length > 0 && (
            <List.Section
              title="Couldn't load"
              subtitle={`${failures.length} account${failures.length === 1 ? "" : "s"} excluded from totals`}
            >
              {failures.map((f) => (
                <List.Item
                  key={f.account.id}
                  icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
                  title={f.account.name ?? f.account.number}
                  subtitle={f.account.institution_name}
                  accessories={[{ text: f.message, tooltip: f.message }]}
                  actions={
                    <ActionPanel>
                      <RefreshAction onRefresh={refresh} />
                      <Action.CopyToClipboard title="Copy Error" content={f.message} />
                      <NavigationActions />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
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
  const oldData = oldDataAsOf(s);
  const accessories: List.Item.Accessory[] = [];
  if (s.stale) {
    accessories.push({
      icon: { source: Icon.Warning, tintColor: Color.Orange },
      text: `as of ${formatAsOf(s.stale.asOf)}`,
      tooltip: `Couldn't refresh holdings (${s.stale.message}). Cash and positions are the last ones loaded, from ${formatAsOf(s.stale.asOf)}. The account total is current.`,
    });
  } else if (oldData) {
    accessories.push({
      icon: { source: Icon.Clock, tintColor: Color.SecondaryText },
      text: `data from ${formatAsOf(oldData)}`,
      tooltip: `SnapTrade's latest data for this account is from ${formatAsOf(oldData)}; it isn't being updated live.`,
    });
  }
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
        color: privacy ? Color.SecondaryText : s.dayChange.amount >= 0 ? Color.Green : Color.Red,
      },
      tooltip: `Change ${formatSnapshotPeriod(s.dayChange)} between SnapTrade balance snapshots`,
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

/**
 * One account's cash and positions. Reads the snapshot the list already loaded (no load of its own on
 * open) and follows it, so ⌘R here updates what's shown.
 */
function AccountHoldings({
  accountId,
  initial,
  refresh,
}: {
  accountId: string;
  initial: AccountSnapshot;
  /** The list's refresh, so ⌘R here reloads the list too and both show the result. */
  refresh: () => Promise<void>;
}) {
  const { privacy, toggle } = usePrivacy();
  const { snapshot: portfolio } = usePortfolio({ load: false });
  const [showDetail, setShowDetail] = useState(false);
  const snapshot = portfolio?.accounts.find((a) => a.account.id === accountId) ?? initial;
  const positions = withWeights(flattenPositions([snapshot]));
  const cash = (snapshot.holdings.balances ?? []).filter((b) => typeof b.cash === "number");
  const title = `${snapshot.account.institution_name} · ${snapshot.account.name ?? snapshot.account.number}`;
  const oldData = oldDataAsOf(snapshot);
  const asOf = snapshot.stale
    ? `as of ${formatAsOf(snapshot.stale.asOf)} (couldn't refresh)`
    : oldData
      ? `data from ${formatAsOf(oldData)}`
      : undefined;
  return (
    <List
      navigationTitle={title}
      isShowingDetail={showDetail}
      searchBarPlaceholder={`Search ${snapshot.account.name ?? "holdings"}…`}
    >
      {cash.length > 0 && (
        <List.Section title="Cash" subtitle={asOf}>
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
      <List.Section title="Positions" subtitle={asOf ? `${positions.length} · ${asOf}` : `${positions.length}`}>
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
