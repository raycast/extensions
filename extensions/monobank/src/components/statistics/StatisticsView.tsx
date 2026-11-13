import { Action, ActionPanel, Color, Icon, List, environment } from "@raycast/api";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/monobank";
import { STORAGE_KEYS } from "../../data/constants";
import { shortcuts } from "../../data/shortcuts";
import { useLocalStorage, useStatistics } from "../../hooks";
import { roundAmount } from "../../services/format";
import { Account, Period, StatisticsFilters, StatisticsViewId } from "../../types";
import {
  DEFAULT_STATISTICS_FILTERS,
  StatisticsRow,
  StatisticsTotals,
  formatAmount,
  formatHryvnias,
  formatShare,
  formatSyncTime,
  getAmountColor,
  getBudgetMonth,
  getDonutImage,
  getRowColor,
  getSliceKey,
  getSlices,
  getStatementItemTitle,
  isStatisticsViewId,
  isSyncedToday,
  resolvePeriod,
  statisticsViewIds,
  statisticsViews,
  toCurrency,
  toStatisticsFilters,
} from "../../utils";
import PeriodForm from "../statement/PeriodForm";
import StatementView from "../statement/StatementView";
import TokenErrorEmptyView, { showInvalidTokenToast } from "../TokenErrorEmptyView";
import StatisticsTransactionsView from "./StatisticsTransactionsView";

const { Metadata } = List.Item.Detail;

const UAH = toCurrency(980);
const THIS_MONTH: Period = { preset: "thisMonth" };
const NO_KEYS: string[] = [];
const OFF_ICON = { source: Icon.Circle, tintColor: Color.SecondaryText };

/**
 * Cash flow across the user's cards and FOP accounts as a donut chart, with four views picked in the search bar:
 * Expenses, Income, Savings and Own Transfers. Every row of the view and every account is switched on and off with
 * ⏎, and the chart and the totals follow at once.
 *
 * The chart is in the detail of every row, since the detail belongs to the selected one. The data is that of
 * `useStatistics`, which updates the switched-on accounts when they're stale.
 */
export default function StatisticsView() {
  const [view, setView] = useState<StatisticsViewId>("expenses");
  const [period, setPeriod] = useState<Period>(THIS_MONTH);
  const stored = useLocalStorage<StatisticsFilters>(STORAGE_KEYS.statisticsFilters, DEFAULT_STATISTICS_FILTERS);
  const filters = useMemo(() => toStatisticsFilters(stored.data), [stored.data]);

  // Nothing loads until the saved filters are read, so the default accounts aren't updated (and the rate limit
  // spent) in place of the chosen ones.
  const data = useStatistics(period, {
    accountIds: filters.accountIds,
    excluded: filters.excluded,
    isReady: !stored.isLoading,
    sync: true,
  });
  const { accounts, enabledIds, enabledAccounts, statements, sync, statistics, tokenError } = data;
  useEffect(() => {
    if (tokenError === "invalid") showInvalidTokenToast();
  }, [tokenError]);

  const viewInfo = statisticsViews[view];
  const rows = statistics.rows[view];
  const excluded = filters.excluded[view] ?? NO_KEYS;
  const total = statistics.totals[view];
  const { isApproximate } = statistics;
  const hasAccounts = enabledIds.size > 0;
  const periodLabel = getBudgetMonth(period)?.label ?? resolvePeriod(period).label;
  const isLoading = stored.isLoading || data.isLoading;

  const approximate = (text: string) => (isApproximate ? `≈ ${text}` : text);
  const formatTotal = (amount: number, options?: { signed?: boolean }) =>
    approximate(formatAmount(roundAmount(amount, UAH), UAH, options));
  // Negated only when not zero, so nothing spent shows "0" rather than "-0".
  const formatOutgoing = (amount: number) => formatTotal(amount ? -amount : 0);

  const slices = useMemo(() => getSlices(rows, excluded), [rows, excluded]);
  // One image per emphasised slice, drawn when a row first needs it.
  const getChart = useMemo(() => {
    const images = new Map<string | undefined, string>();
    return (emphasised?: string) => {
      let image = images.get(emphasised);
      if (!image) {
        image = getDonutImage(slices, {
          label: hasAccounts ? viewInfo.totalLabel : "No accounts",
          value: hasAccounts ? approximate(formatHryvnias(total)) : "",
          appearance: environment.appearance,
          emphasised,
        });
        images.set(emphasised, image);
      }
      return image;
    };
  }, [slices, hasAccounts, viewInfo, total, isApproximate]);

  function getCaption() {
    if (!hasAccounts) return "Select an account below and press Enter to count it.";
    if (isLoading) return undefined;
    if (!rows.length) return `${viewInfo.empty} in this period.`;
    if (!slices.length) return `All ${viewInfo.rowsTitle.toLowerCase()} are hidden.`;
    return undefined;
  }
  const caption = getCaption();
  const getMarkdown = (emphasised?: string) =>
    `![${viewInfo.title}](${getChart(emphasised)})${caption ? `\n\n${caption}` : ""}`;

  function setExcluded(keys: string[]) {
    stored.setData((prev) => {
      const current = toStatisticsFilters(prev);
      return { ...current, excluded: { ...current.excluded, [view]: keys } };
    });
  }

  function toggleRow(key: string) {
    setExcluded(excluded.includes(key) ? excluded.filter((item) => item !== key) : [...excluded, key]);
  }

  function setAccountIds(ids: ReadonlySet<string>) {
    // In the accounts' order, so the same choice is always saved the same way.
    const accountIds = accounts.filter((account) => ids.has(account.id)).map((account) => account.id);
    stored.setData((prev) => ({ ...toStatisticsFilters(prev), accountIds }));
  }

  function toggleAccount(id: string) {
    const ids = new Set(enabledIds);
    if (!ids.delete(id)) ids.add(id);
    setAccountIds(ids);
  }

  const hiddenRows = (id: StatisticsViewId) => {
    const off = new Set(filters.excluded[id]);
    const count = statistics.rows[id].filter((row) => off.has(row.key)).length;
    return count ? ` · ${count} hidden` : "";
  };
  const netAmount = roundAmount(statistics.totals.income - statistics.totals.expenses - statistics.totals.savings, UAH);
  const income = `${formatTotal(statistics.totals.income, { signed: true })}${hiddenRows("income")}`;
  const spent = `${formatOutgoing(statistics.totals.expenses)}${hiddenRows("expenses")}`;
  const saved = `${formatOutgoing(statistics.totals.savings)}${hiddenRows("savings")}`;
  const withdrawn = formatTotal(statistics.totals.withdrawn, { signed: true });
  const ownTransfers = `${formatTotal(statistics.totals.ownTransfers)}${hiddenRows("ownTransfers")}`;
  const net = formatTotal(netAmount, { signed: true });
  const otherCurrencies = [
    ...new Set(
      (enabledAccounts ?? [])
        .filter((account) => account.currency.code !== "UAH" && !statistics.unconverted.includes(account))
        .map((account) => account.currency.code),
    ),
  ].join(", ");
  const noRate = statistics.unconverted.map(getStatementItemTitle).join(", ");
  const updated =
    !sync.isLoading && sync.oldestSyncedAt !== undefined && !isSyncedToday(sync.oldestSyncedAt)
      ? formatSyncTime(sync.oldestSyncedAt)
      : undefined;

  /** The chart and the totals, then `children`: the figures of the selected row. */
  const renderDetail = (emphasised: string | undefined, children: ReactNode) => (
    <List.Item.Detail
      markdown={getMarkdown(emphasised)}
      metadata={
        // Keys include the text: Raycast doesn't resize a label whose text changes in place,
        // so a new key makes it recreate the label instead of truncating the new value.
        <Metadata>
          <Metadata.Label key={`period:${periodLabel}`} title="Period" text={periodLabel} />
          <Metadata.Label key={`income:${income}`} title="Income" text={{ value: income, color: Color.Green }} />
          <Metadata.Label
            key={`spent:${spent}`}
            title="Spent"
            text={{ value: spent, color: statistics.totals.expenses ? Color.Red : undefined }}
          />
          <Metadata.Label key={`saved:${saved}`} title="Saved" text={saved} />
          {statistics.totals.withdrawn !== 0 && (
            <Metadata.Label key={`withdrawn:${withdrawn}`} title="Withdrawn" text={withdrawn} />
          )}
          <Metadata.Label key={`own:${ownTransfers}`} title="To Own Cards" text={ownTransfers} />
          <Metadata.Label key={`net:${net}`} title="Net" text={{ value: net, color: getAmountColor(netAmount) }} />
          {otherCurrencies && (
            <Metadata.Label
              key={`rates:${otherCurrencies}`}
              title="Converted"
              text={`${otherCurrencies} at monobank's rates today`}
            />
          )}
          {noRate && (
            <Metadata.Label
              key={`noRate:${noRate}`}
              title="No Rate Yet"
              text={{ value: noRate, color: Color.Orange }}
            />
          )}
          {sync.isPartial && (
            <Metadata.Label title="Partial" text={{ value: "Older transactions not loaded", color: Color.Orange }} />
          )}
          {updated && <Metadata.Label key={`updated:${updated}`} title="Statements" text={updated} />}
          <Metadata.Separator />
          {children}
        </Metadata>
      }
    />
  );

  const renderRowFigures = (row: StatisticsRow, isOff: boolean) => {
    const amount = formatTotal(row.amount);
    const share = isOff ? "Hidden" : `${formatShare(row.amount, total)} of ${viewInfo.totalLabel.toLowerCase()}`;
    const split = (enabledAccounts ?? []).filter((account) => row.byAccount[account.id]);

    return (
      <>
        <Metadata.Label key={`row:${row.key}:${amount}`} title={row.title} icon={row.icon} text={amount} />
        <Metadata.Label key={`share:${share}`} title="Share" text={share} />
        <Metadata.Label key={`count:${row.count}`} title="Transactions" text={`${row.count}`} />
        {split.length > 1 &&
          split.map((account) => {
            const text = formatTotal(row.byAccount[account.id]);
            return (
              <Metadata.Label
                key={`${account.id}:${text}`}
                title={getStatementItemTitle(account)}
                icon={Icon.CreditCard}
                text={text}
              />
            );
          })}
      </>
    );
  };

  const renderAccountFigures = (account: Account, isOff: boolean, totals: StatisticsTotals | undefined) => {
    const title = getStatementItemTitle(account);
    const state = isOff ? "Not counted" : "Counted";
    const syncedAt = statements.groups.find((group) => group.account.id === account.id)?.syncedAt;
    // An account's own amounts depend on today's rates only when it isn't in UAH.
    const format = (amount: number, options?: { signed?: boolean }) =>
      `${account.currency.code === "UAH" ? "" : "≈ "}${formatAmount(roundAmount(amount, UAH), UAH, options)}`;

    return (
      <>
        <Metadata.Label key={`account:${title}:${state}`} title={title} icon={Icon.CreditCard} text={state} />
        {totals ? (
          (
            [
              ["Income", format(totals.income, { signed: true })],
              ["Spent", format(totals.expenses ? -totals.expenses : 0)],
              ["Saved", format(totals.savings ? -totals.savings : 0)],
              ...(totals.withdrawn ? [["Withdrawn", format(totals.withdrawn, { signed: true })]] : []),
              ["To Own Cards", format(totals.ownTransfers)],
            ] as [title: string, text: string][]
          ).map(([title, text]) => <Metadata.Label key={`${account.id}:${title}:${text}`} title={title} text={text} />)
        ) : (
          <Metadata.Label title="Amounts" text={`No rate for ${account.currency.code} yet`} />
        )}
        {syncedAt !== undefined && (
          <Metadata.Label key={`synced:${syncedAt}`} title="Statement" text={formatSyncTime(syncedAt)} />
        )}
      </>
    );
  };

  const commonActions = (
    <ActionPanel.Section>
      <Action.Push
        title="Change Period…"
        icon={Icon.Calendar}
        shortcut={shortcuts.changePeriod}
        target={<PeriodForm period={period} onChange={setPeriod} />}
      />
      {!tokenError && (
        <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={shortcuts.refresh} onAction={sync.refresh} />
      )}
    </ActionPanel.Section>
  );

  function renderEmptyView() {
    if (tokenError) return <TokenErrorEmptyView tokenError={tokenError} purpose="see your statistics" />;
    if (isLoading || accounts.length) return null;

    if (data.error) {
      const { error } = data;
      return (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Couldn't Load Accounts"
          description={
            (error instanceof ApiError ? error.description : undefined) ??
            (error instanceof Error ? error.message : undefined)
          }
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={data.retry} />
              {commonActions}
            </ActionPanel>
          }
        />
      );
    }

    return (
      <List.EmptyView
        icon={Icon.PieChart}
        title="No Accounts"
        description="Statistics count your monobank cards and FOP accounts."
      />
    );
  }

  const shownRows = rows.filter((row) => !excluded.includes(row.key)).length;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!tokenError && accounts.length > 0}
      searchBarPlaceholder={`Search ${viewInfo.rowsTitle.toLowerCase()} and accounts`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select View"
          storeValue
          onChange={(value) => {
            if (isStatisticsViewId(value)) setView(value);
          }}
        >
          {statisticsViewIds.map((id) => (
            <List.Dropdown.Item key={id} value={id} title={statisticsViews[id].title} icon={statisticsViews[id].icon} />
          ))}
        </List.Dropdown>
      }
    >
      {renderEmptyView()}

      {!tokenError && (
        <>
          <List.Section title={viewInfo.rowsTitle} subtitle={`${shownRows} of ${rows.length} · ${periodLabel}`}>
            {rows.map((row, index) => {
              const isOff = excluded.includes(row.key);
              const amount = approximate(formatHryvnias(row.amount));
              const icon = isOff
                ? OFF_ICON
                : { source: Icon.CircleFilled, tintColor: { ...getRowColor(index), adjustContrast: false } };

              return (
                <List.Item
                  // Rows keep their place when switched off, so nothing moves under the selection.
                  key={row.key}
                  id={`${view}:${row.key}`}
                  icon={icon}
                  title={row.title}
                  keywords={row.keywords}
                  // Not an accessory: Raycast hides those while the detail is shown.
                  subtitle={amount}
                  detail={renderDetail(isOff ? undefined : getSliceKey(row, index), renderRowFigures(row, isOff))}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action
                          title={`${isOff ? "Show" : "Hide"} ${viewInfo.rowName}`}
                          icon={isOff ? Icon.Eye : Icon.EyeDisabled}
                          onAction={() => toggleRow(row.key)}
                        />
                        <Action.Push
                          title="Show Transactions"
                          icon={Icon.List}
                          shortcut={shortcuts.viewStatement}
                          target={
                            <StatisticsTransactionsView
                              view={view}
                              rowKey={row.key}
                              title={row.title}
                              icon={icon}
                              period={period}
                              accountIds={[...enabledIds]}
                            />
                          }
                        />
                        <Action
                          title={`Show Only This ${viewInfo.rowName}`}
                          icon={Icon.Filter}
                          onAction={() =>
                            setExcluded(rows.filter((item) => item.key !== row.key).map((item) => item.key))
                          }
                        />
                        {shownRows < rows.length && (
                          <Action
                            title={`Show All ${viewInfo.rowsTitle}`}
                            icon={Icon.CheckList}
                            onAction={() => setExcluded([])}
                          />
                        )}
                      </ActionPanel.Section>
                      {commonActions}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>

          <List.Section title="Accounts" subtitle={`${enabledIds.size} of ${accounts.length}`}>
            {accounts.map((account) => {
              const isOff = !enabledIds.has(account.id);
              const totals = statistics.byAccount[account.id];
              const prefix = account.currency.code === "UAH" ? "" : "≈ ";
              const amount = totals ? `${prefix}${formatHryvnias(totals[view])}` : "No rate";

              return (
                <List.Item
                  key={account.id}
                  id={`account:${account.id}`}
                  icon={isOff ? OFF_ICON : { source: Icon.CheckCircle, tintColor: Color.Green }}
                  title={getStatementItemTitle(account)}
                  keywords={[account.currency.code, account.type, ...account.maskedPan]}
                  subtitle={amount}
                  detail={renderDetail(undefined, renderAccountFigures(account, isOff, totals))}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action
                          title={`${isOff ? "Show" : "Hide"} Account`}
                          icon={isOff ? Icon.Eye : Icon.EyeDisabled}
                          onAction={() => toggleAccount(account.id)}
                        />
                        <Action.Push
                          title="View Statement"
                          icon={Icon.List}
                          shortcut={shortcuts.viewStatement}
                          target={<StatementView account={account} />}
                        />
                        <Action
                          title="Show Only This Account"
                          icon={Icon.Filter}
                          onAction={() => setAccountIds(new Set([account.id]))}
                        />
                        {enabledIds.size < accounts.length && (
                          <Action
                            title="Show All Accounts"
                            icon={Icon.CheckList}
                            onAction={() => setAccountIds(new Set(accounts.map((item) => item.id)))}
                          />
                        )}
                      </ActionPanel.Section>
                      {commonActions}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        </>
      )}
    </List>
  );
}
