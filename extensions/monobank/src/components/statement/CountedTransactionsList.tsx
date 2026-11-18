import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { shortcuts } from "../../data/shortcuts";
import { useBudgetAccounts, useBudgets } from "../../hooks";
import { roundAmount } from "../../services/format";
import { Account, CountedTransaction } from "../../types";
import {
  filterTransactions,
  formatAmount,
  formatHryvnias,
  getStatementItemTitle,
  groupByDay,
  toCurrency,
} from "../../utils";
import StatementView from "./StatementView";
import TransactionListItem from "./TransactionListItem";

const { Metadata } = List.Item.Detail;

const UAH = toCurrency(980);
const NO_ENTRIES: CountedTransaction[] = [];

/**
 * The transactions behind a figure, e.g. a row of "Show Statistics" or a budget's spending: a total, then the
 * transactions by day, across the accounts the figure counts. `entries` come from the code that counts the figure,
 * so the total equals it.
 */
export default function CountedTransactionsList<T extends CountedTransaction>(props: {
  navigationTitle: string;
  isLoading: boolean;
  /** What the transactions make up, e.g. the category or the budget. */
  title: string;
  icon: Image.ImageLike;
  /** The transactions the figure counts, newest first. */
  entries: T[];
  /** The ones left out of it by hand, newest first. They're listed last and aren't in the total. */
  excluded?: CountedTransaction[];
  /** Whether the amounts depend on today's rates, so the totals show "≈". */
  isApproximate?: boolean;
  /** Whether the figure never goes below 0, like a budget's spending. */
  isFloored?: boolean;
  /** Why the total may not be final, e.g. "Partial: older transactions not loaded". */
  note?: string;
  /** A tag before a transaction's other accessories, e.g. "Added". */
  getTag?: (entry: T) => List.Item.Accessory | undefined;
  /** Shown when there are no transactions. */
  emptyDescription?: string;
}) {
  const {
    navigationTitle,
    isLoading,
    title,
    icon,
    entries,
    excluded = NO_ENTRIES,
    isApproximate = false,
    isFloored = false,
    note,
    getTag,
    emptyDescription,
  } = props;
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();
  const isSearching = query.length > 0;

  // Budget corrections work here as in the statement, on the accounts budgets count.
  const { budgets, setTransactionBudgets } = useBudgets();
  const budgetAccounts = useBudgetAccounts();
  const budgetAccountIds = useMemo(
    () => new Set(budgetAccounts.accounts?.map((account) => account.id)),
    [budgetAccounts.accounts],
  );

  const hasSeveralAccounts = useMemo(
    () => new Set([...entries, ...excluded].map((entry) => entry.account.id)).size > 1,
    [entries, excluded],
  );

  // Filtered here rather than by Raycast, so the total stays at the top and totals what the search found.
  const [filtered, filteredExcluded] = useMemo(() => {
    const filter = <E extends CountedTransaction>(list: E[]) =>
      filterTransactions(
        list,
        searchText,
        (entry) => [getStatementItemTitle(entry.account)],
        (entry) => entry.transaction,
      );
    return [filter(entries), filter(excluded)];
  }, [entries, excluded, searchText]);
  const days = useMemo(
    () =>
      groupByDay(filtered, ({ transaction, amount }) => ({
        time: transaction.time,
        // Signed like the transaction, as a day of the statement: money out is negative.
        amount: Math.sign(transaction.amount) * Math.abs(amount),
      })),
    [filtered],
  );

  const sum = filtered.reduce((total, entry) => total + entry.amount, 0);
  // A search may find only refunds, which the whole figure can't go below 0 for. `|| 0` keeps "-0" out.
  const total = roundAmount(isFloored && !isSearching ? Math.max(sum, 0) : sum, UAH) || 0;
  const approximate = (text: string) => (isApproximate ? `≈ ${text}` : text);
  const count = isSearching ? `${filtered.length} of ${formatCount(entries.length)}` : formatCount(entries.length);
  const exactTotal = approximate(formatAmount(total, UAH));
  const excludedCount = formatCount(excluded.length);

  // `account`: the one of the selected transaction. `isFirst`: the first actions take ⏎, so they get no shortcut.
  const renderActions = (account?: Account, isFirst = false) => (
    <ActionPanel.Section>
      <Action
        title="Toggle Details"
        icon={Icon.Sidebar}
        shortcut={isFirst ? undefined : shortcuts.toggleDetails}
        onAction={() => setIsShowingDetail((value) => !value)}
      />
      {account && (
        <Action.Push
          title="View Statement"
          icon={Icon.List}
          shortcut={shortcuts.viewStatement}
          target={<StatementView account={account} />}
        />
      )}
    </ActionPanel.Section>
  );

  const renderItem = ({ account, transaction }: CountedTransaction, tag?: List.Item.Accessory) => {
    // Both sides of a transfer between the user's accounts have one id.
    const id = `${account.id}:${transaction.id}`;
    return (
      <TransactionListItem
        key={id}
        id={id}
        transaction={transaction}
        accountTitle={getStatementItemTitle(account)}
        hasAccountTag={hasSeveralAccounts}
        cashbackType={account.cashbackType}
        isShowingDetail={isShowingDetail}
        actions={renderActions(account)}
        budgets={budgetAccountIds.has(account.id) ? budgets : undefined}
        onSetBudgets={setTransactionBudgets}
        tag={tag}
      />
    );
  };

  const hasEntries = entries.length > 0 || excluded.length > 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && hasEntries}
      navigationTitle={navigationTitle}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search transactions"
    >
      {!hasEntries && <List.EmptyView icon={Icon.Receipt} title="No Transactions" description={emptyDescription} />}

      {hasEntries && (
        <List.Item
          id="total"
          icon={icon}
          title={title}
          subtitle={isSearching && !filtered.length ? "No matching transactions" : undefined}
          accessories={[
            ...(note ? [{ icon: { source: Icon.Warning, tintColor: Color.Orange }, tooltip: note }] : []),
            ...(isShowingDetail ? [] : [{ text: count }]),
            { text: { value: approximate(formatHryvnias(total)), color: Color.PrimaryText } },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                // Keys include the text, so Raycast recreates a label whose text changed instead of truncating it.
                <Metadata>
                  <Metadata.Label key={`total:${title}:${exactTotal}`} title={title} icon={icon} text={exactTotal} />
                  {isSearching && <Metadata.Label key={`search:${query}`} title="Search" text={query} />}
                  <Metadata.Label key={`count:${count}`} title="Transactions" text={count} />
                  {excluded.length > 0 && (
                    <Metadata.Label key={`excluded:${excludedCount}`} title="Excluded" text={excludedCount} />
                  )}
                  {note && (
                    <Metadata.Label key={`note:${note}`} title="Note" text={{ value: note, color: Color.Orange }} />
                  )}
                </Metadata>
              }
            />
          }
          actions={<ActionPanel>{renderActions(undefined, true)}</ActionPanel>}
        />
      )}

      {days.map((day) => (
        <List.Section
          key={day.key}
          title={day.title}
          subtitle={approximate(formatAmount(roundAmount(day.net, UAH), UAH, { signed: true }))}
        >
          {day.items.map((entry) => renderItem(entry, getTag?.(entry)))}
        </List.Section>
      ))}

      {filteredExcluded.length > 0 && (
        <List.Section title="Excluded" subtitle="Not counted">
          {filteredExcluded.map((entry) => renderItem(entry))}
        </List.Section>
      )}
    </List>
  );
}

/** E.g. "12 transactions". */
function formatCount(count: number) {
  return `${count} ${count === 1 ? "transaction" : "transactions"}`;
}
