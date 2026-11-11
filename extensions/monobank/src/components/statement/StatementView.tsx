import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  showHUD,
  showInFinder,
  showToast,
} from "@raycast/api";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, parse } from "node:path";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, TokenError } from "../../api/monobank";
import { STATEMENT_SELECTION_TTL, STORAGE_KEYS } from "../../data/constants";
import {
  useBudgetAccounts,
  useAccountStatements,
  useBudgets,
  useRecentValue,
  useStatement,
  useStatementAccount,
  useSubscriptions,
} from "../../hooks";
import { AccountOrJar, Period, SavedPeriod, Subscription, Transaction } from "../../types";
import {
  DEFAULT_PERIOD,
  filterTransactions,
  formatAmount,
  formatDateRange,
  getBudgetMonth,
  getBudgetProgress,
  getCsvFileName,
  getStatementItemTitle,
  groupByDay,
  isAccount,
  isPreset,
  isSavedPeriod,
  summarize,
  toCsv,
} from "../../utils";
import AccountDropdown from "../AccountDropdown";
import TokenErrorEmptyView, { showInvalidTokenToast } from "../TokenErrorEmptyView";
import StatementActionsSection, { StatementActionsProps } from "./StatementActionsSection";
import SummaryListItem from "./SummaryListItem";
import TransactionListItem from "./TransactionListItem";

/**
 * Transactions of an account or jar. Without `account`, the account is picked in the search bar
 * (the "Show Statement" command); with it, the account is fixed ("View Statement" in "Show Accounts"), and the view
 * is pushed, so it's titled after the account.
 */
export default function StatementView(props: { account?: AccountOrJar }) {
  return props.account ? <StatementList account={props.account} isPushed /> : <StatementCommand />;
}

function StatementCommand() {
  const { account, setAccountId, sections, isLoading, tokenError } = useStatementAccount();

  const dropdown = account && (
    // Rendered only once the account is known, so it starts on it instead of the first item.
    <AccountDropdown value={account.id} onChange={setAccountId} sections={sections} />
  );

  return (
    <StatementList
      account={account}
      accountDropdown={dropdown}
      isLoadingAccounts={isLoading}
      accountsTokenError={tokenError}
    />
  );
}

function StatementList(props: {
  account: AccountOrJar | undefined;
  accountDropdown?: List.Props["searchBarAccessory"];
  isLoadingAccounts?: boolean;
  accountsTokenError?: TokenError;
  /** Whether the view was pushed: only then it has a navigation title, as the command's own shows at the root. */
  isPushed?: boolean;
}) {
  const { account, accountDropdown, isLoadingAccounts = false, accountsTokenError, isPushed = false } = props;
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [searchText, setSearchText] = useState("");
  const {
    value: savedPeriod,
    setValue: setSavedPeriod,
    isLoading: isLoadingPeriod,
  } = useRecentValue<SavedPeriod>(STORAGE_KEYS.statementPeriod, STATEMENT_SELECTION_TTL, isSavedPeriod);
  // Derived during render, so switching accounts resets the period at once: the old period is never
  // requested for the new account.
  const period = account && savedPeriod?.accountId === account.id ? savedPeriod.period : DEFAULT_PERIOD;

  function setPeriod(period: Period) {
    if (account) setSavedPeriod({ accountId: account.id, period });
  }

  // Waits for the saved period, so the default one isn't fetched (and the rate limit spent) by mistake.
  const statement = useStatement(account, isLoadingPeriod ? undefined : period);
  const { transactions, hasMore, missing } = statement;
  const missingText = missing && formatDateRange(missing.from, missing.to);
  const tokenError = accountsTokenError ?? statement.tokenError;

  useEffect(() => {
    if (tokenError === "invalid") showInvalidTokenToast();
  }, [tokenError]);

  // Subscriptions of this account, from its stored history like in "Show Subscriptions". Jars have none.
  const [now] = useState(() => new Date());
  const subscriptionAccounts = useMemo(() => (account && isAccount(account) ? [account] : undefined), [account?.id]);
  const { subscriptions, setHidden: setSubscriptionHidden } = useSubscriptions(subscriptionAccounts, now);
  const subscriptionByCharge = useMemo(() => {
    const map = new Map<string, Subscription>();
    for (const subscription of subscriptions) {
      for (const charge of subscription.charges) map.set(charge.id, subscription);
    }
    return map;
  }, [subscriptions]);
  // Charges with the Subscription tag: hidden subscriptions have none.
  const isSubscriptionCharge = useCallback(
    (transaction: Transaction) => {
      const subscription = subscriptionByCharge.get(transaction.id);
      return !!subscription && !subscription.hidden;
    },
    [subscriptionByCharge],
  );

  // Filtered here rather than by Raycast, so the Summary stays at the top and totals what the search found.
  // "subscription" finds the charges with the Subscription tag.
  const filtered = useMemo(
    () =>
      filterTransactions(transactions, searchText, (transaction) =>
        isSubscriptionCharge(transaction) ? SUBSCRIPTION_SEARCH_TEXTS : [],
      ),
    [transactions, searchText, isSubscriptionCharge],
  );
  const days = useMemo(() => groupByDay(filtered), [filtered]);
  const summary = useMemo(
    () => summarize(filtered, account?.currency, isSubscriptionCharge),
    [filtered, account?.currency, isSubscriptionCharge],
  );

  // Budgets count the budget accounts for a calendar month, from every loaded transaction, whatever the search.
  // They show only on a budget account: this one's live transactions plus the stored ones of the others.
  const { budgets } = useBudgets();
  const budgetAccounts = useBudgetAccounts();
  const isBudgetAccount = !!account && !!budgetAccounts.accounts?.some((item) => item.id === account.id);
  const budgetMonth = useMemo(() => (isBudgetAccount ? getBudgetMonth(period) : undefined), [isBudgetAccount, period]);
  const otherBudgetAccounts = useMemo(
    () => budgetAccounts.accounts?.filter((item) => item.id !== account?.id),
    [budgetAccounts.accounts, account?.id],
  );
  // Stored data only: the Summary never spends the rate limit on other cards.
  const otherStatements = useAccountStatements(otherBudgetAccounts, budgetMonth && period, { sync: false });
  const budgetProgress = useMemo(() => {
    if (!budgetMonth || !account) return [];
    const groups = [
      { accountId: account.id, transactions },
      ...otherStatements.groups.map((group) => ({ accountId: group.account.id, transactions: group.transactions })),
    ];
    return getBudgetProgress(budgets, groups, budgetMonth);
  }, [budgets, transactions, otherStatements.groups, budgetMonth, account?.id]);

  const accountTitle = account ? getStatementItemTitle(account) : undefined;
  const cashbackType = account && isAccount(account) ? account.cashbackType : undefined;
  const isLoading = isLoadingAccounts || isLoadingPeriod || statement.isLoading;

  async function exportCsv() {
    const path = getAvailablePath(join(homedir(), "Downloads", getCsvFileName(accountTitle ?? "", transactions)));
    // The byte order mark makes Excel read the file as UTF-8, so Cyrillic text shows correctly.
    await writeFile(path, "﻿" + toCsv(transactions));
    await showInFinder(path);
    await showToast({
      style: Toast.Style.Success,
      title: `Exported ${transactions.length} transactions`,
      message: missingText ? `${missingText} wasn't loaded` : undefined,
    });
  }

  async function copyCsv() {
    await Clipboard.copy(toCsv(transactions));
    await showHUD("Copied to Clipboard");
  }

  const statementActions: StatementActionsProps = {
    period,
    onChangePeriod: setPeriod,
    onExportCsv: transactions.length ? exportCsv : undefined,
    onCopyCsv: transactions.length ? copyCsv : undefined,
    onRefresh: statement.refresh,
    onToggleDetails: () => setIsShowingDetail((isShowingDetail) => !isShowingDetail),
    // "Manage Budgets…" loads its own month: the statement's period may not be one.
    budgets: { initialMonth: isPreset(period) && period.preset === "lastMonth" ? "lastMonth" : "thisMonth" },
  };

  function renderEmptyView() {
    if (tokenError) {
      return <TokenErrorEmptyView tokenError={tokenError} purpose="see your statement" />;
    }

    // With transactions, the list is never empty: the Summary is always shown, even when the search matches nothing.
    if (transactions.length) return null;

    if (!account) {
      return <List.EmptyView icon={Icon.CreditCard} title="No Accounts" description="No accounts to show." />;
    }

    if (statement.error && !statement.isLoading) {
      const { error } = statement;
      return (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Couldn't Load Statement"
          description={
            (error instanceof ApiError ? error.description : undefined) ??
            (error instanceof Error ? error.message : undefined)
          }
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={statement.retry} />
              <StatementActionsSection {...statementActions} actionsBefore={1} />
            </ActionPanel>
          }
        />
      );
    }

    return (
      <List.EmptyView
        icon={Icon.Receipt}
        title="No Transactions in This Period"
        description={statement.period ? `${accountTitle} · ${statement.period.label}` : undefined}
        actions={
          <ActionPanel>
            <StatementActionsSection {...statementActions} actionsBefore={0} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      navigationTitle={
        isPushed && accountTitle ? [accountTitle, statement.period?.label].filter(Boolean).join(" · ") : undefined
      }
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search transactions"
      searchBarAccessory={accountDropdown}
    >
      {renderEmptyView()}

      {transactions.length > 0 && statement.period && (
        <SummaryListItem
          summary={summary}
          periodLabel={statement.period.label}
          searchText={searchText.trim()}
          totalCount={transactions.length}
          budgetProgress={budgetProgress}
          budgetMonth={budgetMonth}
          budgetCardCount={(otherBudgetAccounts?.length ?? 0) + 1}
          otherCardsSyncedAt={otherStatements.oldestSyncedAt}
          missing={missing}
          isOtherCardsPartial={otherStatements.isPartial}
          statement={statementActions}
        />
      )}

      {days.map((day) => (
        <List.Section
          key={day.key}
          title={day.title}
          subtitle={summary.currency && formatAmount(day.net, summary.currency, { signed: true })}
        >
          {day.transactions.map((transaction) => (
            <TransactionListItem
              key={transaction.id}
              transaction={transaction}
              cashbackType={cashbackType}
              isShowingDetail={isShowingDetail}
              statement={statementActions}
              subscription={subscriptionByCharge.get(transaction.id)}
              onSetSubscriptionHidden={setSubscriptionHidden}
            />
          ))}
        </List.Section>
      ))}

      {hasMore && (
        <List.Item
          id="load-older"
          icon={{ source: Icon.ArrowDown, tintColor: Color.SecondaryText }}
          title="Load Older Transactions"
          subtitle={missingText && `Not loaded: ${missingText}`}
          detail={<List.Item.Detail markdown={LOAD_OLDER_MARKDOWN} />}
          actions={
            <ActionPanel>
              <Action title="Load Older Transactions" icon={Icon.ArrowDown} onAction={statement.loadOlder} />
              <StatementActionsSection {...statementActions} actionsBefore={1} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

const LOAD_OLDER_MARKDOWN =
  "The totals above don't include the transactions not loaded yet. monobank sends up to 500 transactions, " +
  "or 31 days, per request, so this loads the next part of the period.";

/** What the Subscription tag is found by, in English and Ukrainian. */
const SUBSCRIPTION_SEARCH_TEXTS = ["Subscription", "Підписка"];

/** `path`, or `name (2).ext`, `name (3).ext`… if a file with that name already exists. */
function getAvailablePath(path: string) {
  const { dir, name, ext } = parse(path);
  let candidate = path;
  for (let index = 2; existsSync(candidate); index++) {
    candidate = join(dir, `${name} (${index})${ext}`);
  }
  return candidate;
}
