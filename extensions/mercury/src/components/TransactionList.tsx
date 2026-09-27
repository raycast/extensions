import { useEffect, useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, Image, Keyboard, List } from "@raycast/api";
import { getAvatarIcon, getFavicon, useCachedState, usePromise } from "@raycast/utils";
import { categoryOf, Category } from "../categories";
import { ExportTransactionsSubmenu, transactionRow } from "../export";
import { accountLabel, formatCurrency, formatDate, formatDateTime, formatSignedCurrency, humanize } from "../format";

import { MercuryLogin } from "../logins";
import { Account, Card, getAccounts, getCards, log, mercuryGet, Transaction, toError } from "../mercury";
import { FailureRows, LoginErrorView } from "./ErrorViews";
import { TransactionDetails, partyRole, transactionAsText } from "./TransactionDetails";

/** Where the list's transactions come from. */
export type TransactionScope =
  | { kind: "all"; logins: MercuryLogin[] }
  | { kind: "account"; login: MercuryLogin; account: Account }
  | { kind: "card"; login: MercuryLogin; card: Card };

/** A transaction plus the login it was fetched with, so rows can name their account. */
export interface LoadedTransaction extends Transaction {
  login: MercuryLogin;
}

const ALL = "all";
// ponytail: one page (500 per login, newest first); search reaches older history on the server.
const PAGE = 500;
// The per-account endpoint returns only the last 30 days unless a start date is sent.
const SINCE_THE_BEGINNING = "2000-01-01";

interface Loaded {
  transactions: LoadedTransaction[];
  failures: Array<{ login: MercuryLogin; error: Error }>;
}

interface Directory {
  accounts: Map<string, { account: Account; login: MercuryLogin }>;
  cards: Map<string, Card>;
}

function scopeLogins(scope: TransactionScope) {
  return scope.kind === "all" ? scope.logins : [scope.login];
}

/** Account and card names for labeling rows. Fetched once per scope, not on every keystroke. */
async function loadDirectory(scope: TransactionScope): Promise<Directory> {
  const directory: Directory = { accounts: new Map(), cards: new Map() };
  await Promise.all(
    scopeLogins(scope).map(async (login) => {
      const [accounts, cards] = await Promise.all([
        getAccounts(login.token).catch(() => [] as Account[]),
        getCards(login.token).catch(() => [] as Card[]),
      ]);
      for (const account of accounts) directory.accounts.set(account.id, { account, login });
      for (const card of cards) directory.cards.set(card.id, card);
    }),
  );
  return directory;
}

function query(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  return search.toString();
}

async function loadLogin(login: MercuryLogin, path: string): Promise<LoadedTransaction[]> {
  const data = await mercuryGet<{ transactions: Transaction[] }>(login.token, path);
  return data.transactions.map((transaction) => ({ ...transaction, login }));
}

async function loadTransactions(scope: TransactionScope, filter: string, search: string): Promise<Loaded> {
  const loaded: Loaded = { transactions: [], failures: [] };
  const jobs: Array<{ login: MercuryLogin; path: string }> = [];

  if (scope.kind === "all") {
    const [loginId, accountId] = filter === ALL ? [] : filter.split(":");
    for (const login of scope.logins) {
      if (loginId && login.id !== loginId) continue;
      jobs.push({
        login,
        path: accountId
          ? `/account/${accountId}/transactions?${query({ limit: String(PAGE), order: "desc", start: SINCE_THE_BEGINNING, search })}`
          : `/transactions?${query({ limit: String(PAGE), order: "desc", search })}`,
      });
    }
  } else if (scope.kind === "account") {
    const [type, value] =
      filter === ALL ? [] : [filter.slice(0, filter.indexOf(":")), filter.slice(filter.indexOf(":") + 1)];
    jobs.push({
      login: scope.login,
      path: `/account/${scope.account.id}/transactions?${query({
        limit: String(PAGE),
        order: "desc",
        start: SINCE_THE_BEGINNING,
        search,
        status: type === "status" ? value : undefined,
        mercuryCategory: type === "category" && value && !value.startsWith("categoryId:") ? value : undefined,
        categoryId:
          type === "category" && value?.startsWith("categoryId:") ? value.slice("categoryId:".length) : undefined,
      })}`,
    });
  } else {
    jobs.push({
      login: scope.login,
      path: `/transactions?${query({ limit: String(PAGE), order: "desc", search, cardId: scope.card.id })}`,
    });
  }

  const results = await Promise.allSettled(jobs.map((job) => loadLogin(job.login, job.path)));
  results.forEach((result, index) => {
    const { login } = jobs[index];
    if (result.status === "rejected") {
      const error = toError(result.reason);
      log.error("Couldn't load transactions", { login: login.name, reason: error.message });
      loaded.failures.push({ login, error });
      return;
    }
    loaded.transactions.push(...result.value);
  });

  // The card filter is sent to Mercury, and checked again here in case it is ignored.
  if (scope.kind === "card") loaded.transactions = loaded.transactions.filter((t) => t.cardId === scope.card.id);
  loaded.transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return loaded;
}

/** Consecutive items under "Today", "Yesterday", or a date heading. Items must already be sorted. */
export function groupByDay<T>(items: T[], isoOf: (item: T) => string): Array<{ title: string; items: T[] }> {
  const groups: Array<{ title: string; items: T[] }> = [];
  for (const item of items) {
    const title = dayLabel(isoOf(item));
    if (groups.at(-1)?.title !== title) groups.push({ title, items: [] });
    groups.at(-1)!.items.push(item);
  }
  return groups;
}

export function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export function statusIcon(status: Transaction["status"]): Image.ImageLike {
  switch (status) {
    case "sent":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "pending":
      return { source: Icon.CircleProgress50, tintColor: Color.Blue };
    case "failed":
    case "blocked":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.MinusCircle, tintColor: Color.SecondaryText };
  }
}

function scopeTitle(scope: TransactionScope) {
  if (scope.kind === "account") return accountLabel(scope.account);
  if (scope.kind === "card") return `${scope.card.nickname || scope.card.nameOnCard} ••${scope.card.lastFour}`;
  return undefined;
}

export function TransactionList({
  scope,
  onLoginsChanged,
  initialFilter = ALL,
}: {
  scope: TransactionScope;
  onLoginsChanged?: () => void;
  /** `<loginId>:<accountId>` to open Search Transactions on one account (from the menu bar). */
  initialFilter?: string;
}) {
  const [search, setSearch] = useState("");
  // A filter handed over from the menu bar can name an account that has since been removed.
  const [filter, setFilter] = useState(() =>
    scope.kind === "all" && !scope.logins.some((login) => initialFilter.startsWith(`${login.id}:`))
      ? ALL
      : initialFilter,
  );
  const [showingSidebar, setShowingSidebar] = useCachedState("show-transaction-sidebar", false);
  // In memory only (usePromise does not persist its arguments). Including the tokens makes an
  // updated token refetch instead of reusing the rejected one.
  const tokens = (scope.kind === "all" ? scope.logins : [scope.login])
    .map((login) => `${login.id}:${login.token}`)
    .join(",");
  const scopeKey =
    scope.kind === "all"
      ? `all:${tokens}`
      : scope.kind === "account"
        ? `account:${scope.account.id}:${tokens}`
        : `card:${scope.card.id}:${tokens}`;

  const { data, isLoading, revalidate } = usePromise(
    // scopeKey drives refetching; the scope object itself holds tokens and is read from the closure.
    (_key: string, currentFilter: string, currentSearch: string) =>
      loadTransactions(scope, currentFilter, currentSearch),
    [scopeKey, filter, search],
    { onError: () => {} },
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: directory } = usePromise((_key: string) => loadDirectory(scope), [scopeKey], { onError: () => {} });

  // A filter from the menu bar can name an account that has since been removed.
  useEffect(() => {
    if (scope.kind === "all" && directory && filter !== ALL && !directory.accounts.has(filter.split(":")[1]))
      setFilter(ALL);
  }, [directory, filter]);

  // Categories seen while unfiltered, so picking one doesn't shrink the menu to itself.
  const seenCategories = useRef(new Map<string, Category>());
  if (filter === ALL)
    for (const t of data?.transactions ?? []) {
      const category = categoryOf(t);
      if (category) seenCategories.current.set(category.key, category);
    }
  const categories = [...seenCategories.current.values()].sort((a, b) => a.label.localeCompare(b.label));

  const transactions = data?.transactions ?? [];
  const accountName = (t: LoadedTransaction) => {
    const entry = directory?.accounts.get(t.accountId);
    return entry ? accountLabel(entry.account) : "Mercury";
  };
  const exportRows = transactions.map((t) => transactionRow(t, accountName(t)));
  const exportName =
    scope.kind === "all"
      ? "mercury-transactions"
      : `mercury-${(scopeTitle(scope) ?? "transactions").replace(/[^\w]+/g, "-").toLowerCase()}`;

  const sections = groupByDay(transactions, (transaction) => transaction.createdAt);

  const failure = data?.failures[0];
  const selectedAccount =
    scope.kind === "all" && filter !== ALL ? directory?.accounts.get(filter.split(":")[1]) : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingSidebar && transactions.length > 0}
      filtering={false}
      throttle
      onSearchTextChange={setSearch}
      navigationTitle={scopeTitle(scope)}
      searchBarPlaceholder={scope.kind === "all" ? "Search transactions…" : `Search ${scopeTitle(scope)}…`}
      searchBarAccessory={
        scope.kind === "card" ? undefined : (
          <List.Dropdown
            tooltip={scope.kind === "all" ? "Filter by Account" : "Filter by Status or Category"}
            value={filter}
            onChange={setFilter}
          >
            <List.Dropdown.Item title={scope.kind === "all" ? "All Accounts" : "All Transactions"} value={ALL} />
            {scope.kind === "all"
              ? scope.logins.map((login) => (
                  <List.Dropdown.Section key={login.id} title={login.name}>
                    {[...(directory?.accounts.values() ?? [])]
                      .filter((entry) => entry.login.id === login.id)
                      .map(({ account }) => (
                        <List.Dropdown.Item
                          key={account.id}
                          title={accountLabel(account)}
                          value={`${login.id}:${account.id}`}
                        />
                      ))}
                  </List.Dropdown.Section>
                ))
              : [
                  <List.Dropdown.Section key="status" title="Status">
                    <List.Dropdown.Item title="Pending" value="status:pending" />
                    <List.Dropdown.Item title="Failed" value="status:failed" />
                  </List.Dropdown.Section>,
                  <List.Dropdown.Section key="category" title="Category">
                    {categories.map((category) => (
                      <List.Dropdown.Item
                        key={category.key}
                        title={category.label}
                        icon={{ source: Icon.CircleFilled, tintColor: category.color }}
                        value={`category:${category.key}`}
                      />
                    ))}
                  </List.Dropdown.Section>,
                ]}
          </List.Dropdown>
        )
      }
    >
      {!isLoading && transactions.length === 0 && (data?.failures.length ?? 0) > 1 && (
        <FailureRows failures={data?.failures ?? []} onRetry={revalidate} onUpdated={() => onLoginsChanged?.()} />
      )}
      {!isLoading && transactions.length === 0 && data?.failures.length === 1 && failure && (
        <LoginErrorView
          login={failure.login}
          error={failure.error}
          onRetry={revalidate}
          onUpdated={() => (onLoginsChanged ? onLoginsChanged() : revalidate())}
        />
      )}
      {!isLoading && transactions.length === 0 && !failure && (
        <EmptyTransactions
          scope={scope}
          filter={filter}
          search={search}
          selectedAccountName={selectedAccount ? accountLabel(selectedAccount.account) : undefined}
          onSearchEverywhere={() => setFilter(ALL)}
        />
      )}
      {transactions.length > 0 && (
        <FailureRows failures={data?.failures ?? []} onRetry={revalidate} onUpdated={() => onLoginsChanged?.()} />
      )}
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              accountName={accountName(transaction)}
              card={transaction.cardId ? directory?.cards.get(transaction.cardId) : undefined}
              showingSidebar={showingSidebar}
              onToggleSidebar={() => setShowingSidebar((value) => !value)}
              onRefresh={revalidate}
              scopeKind={scope.kind}
              exportName={exportName}
              exportRows={exportRows}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function EmptyTransactions({
  scope,
  filter,
  search,
  selectedAccountName,
  onSearchEverywhere,
}: {
  scope: TransactionScope;
  filter: string;
  search: string;
  selectedAccountName?: string;
  onSearchEverywhere: () => void;
}) {
  const where = selectedAccountName ?? scopeTitle(scope) ?? "this account";
  if (search && scope.kind === "all" && filter !== ALL) {
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={`No transactions match “${search}” in ${where}`}
        description="Hit enter to search everywhere."
        actions={
          <ActionPanel>
            <Action title="Search All Accounts" icon={Icon.MagnifyingGlass} onAction={onSearchEverywhere} />
          </ActionPanel>
        }
      />
    );
  }
  if (search) return <List.EmptyView icon={Icon.MagnifyingGlass} title={`No transactions match “${search}”`} />;
  if (filter === "status:failed") {
    return (
      <List.EmptyView
        icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
        title="No failed transactions"
        description={where ? `Every payment from ${where} went through.` : undefined}
      />
    );
  }
  if (filter === "status:pending") return <List.EmptyView icon={Icon.CheckCircle} title="Nothing pending" />;
  return <List.EmptyView icon={Icon.List} title="No transactions yet" />;
}

function TransactionItem({
  transaction,
  accountName,
  card,
  showingSidebar,
  onToggleSidebar,
  onRefresh,
  scopeKind,
  exportName,
  exportRows,
}: {
  transaction: LoadedTransaction;
  accountName: string;
  card?: Card;
  showingSidebar: boolean;
  onToggleSidebar: () => void;
  onRefresh: () => void;
  scopeKind: TransactionScope["kind"];
  exportName: string;
  exportRows: string[][];
}) {
  const name = transaction.counterpartyNickname || transaction.counterpartyName;
  const role = partyRole(transaction);
  const category = categoryOf(transaction);
  const failed = transaction.status === "failed" || transaction.status === "cancelled";
  const amountColor = failed ? Color.SecondaryText : transaction.amount < 0 ? Color.Red : Color.Green;
  const receipt = transaction.attachments?.find((attachment) => attachment.attachmentType === "receipt");
  const cardLabel = card ? `${card.nickname || card.nameOnCard} ••${card.lastFour}` : undefined;

  return (
    <List.Item
      icon={getAvatarIcon(name)}
      title={name}
      // Your own note only. Bank memos are raw ACH strings ("REF*TN*…"); they stay in the sidebar and details.
      subtitle={showingSidebar ? undefined : transaction.note || undefined}
      accessories={
        showingSidebar
          ? [{ text: { value: formatCurrency(Math.abs(transaction.amount)), color: amountColor } }]
          : [
              ...(category ? [{ tag: { value: category.label, color: category.color } }] : []),
              { text: { value: formatCurrency(Math.abs(transaction.amount)), color: amountColor } },
              // Sent is the normal case, so only a status that needs attention gets an icon.
              ...(transaction.status === "sent"
                ? []
                : [{ icon: statusIcon(transaction.status), tooltip: humanize(transaction.status) }]),
            ]
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Amount"
                text={{ value: formatSignedCurrency(transaction.amount), color: amountColor }}
              />
              <List.Item.Detail.Metadata.Label title={role} text={name} />
              <List.Item.Detail.Metadata.Label
                title="Status"
                text={humanize(transaction.status)}
                icon={statusIcon(transaction.status)}
              />
              {transaction.reasonForFailure && (
                <List.Item.Detail.Metadata.Label
                  title="Reason"
                  text={{ value: transaction.reasonForFailure, color: Color.Red }}
                />
              )}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Account" text={accountName} />
              {cardLabel && <List.Item.Detail.Metadata.Label title="Card" text={cardLabel} />}
              {category && (
                <List.Item.Detail.Metadata.TagList title="Category">
                  <List.Item.Detail.Metadata.TagList.Item text={category.label} color={category.color} />
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Label title="Type" text={humanize(transaction.kind)} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Created" text={formatDateTime(transaction.createdAt)} />
              {transaction.postedAt && (
                <List.Item.Detail.Metadata.Label title="Posted" text={formatDate(transaction.postedAt)} />
              )}
              {!transaction.postedAt && transaction.status === "pending" && transaction.estimatedDeliveryDate && (
                <List.Item.Detail.Metadata.Label
                  title="Expected"
                  text={formatDate(transaction.estimatedDeliveryDate)}
                />
              )}
              {transaction.note && <List.Item.Detail.Metadata.Label title="Note" text={transaction.note} />}
              {transaction.externalMemo && (
                <List.Item.Detail.Metadata.Label title="Memo" text={transaction.externalMemo} />
              )}
              {receipt && (
                <List.Item.Detail.Metadata.Link title="Receipt" text={receipt.fileName} target={receipt.url} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Details"
              icon={Icon.Receipt}
              target={
                <TransactionDetails
                  transaction={transaction}
                  accountName={accountName}
                  cardLabel={cardLabel}
                  primary={scopeKind === "card" ? "open" : "copy"}
                />
              }
            />
            <Action.OpenInBrowser
              title="Open in Mercury"
              icon={getFavicon("https://mercury.com")}
              url={transaction.dashboardLink}
            />
            {receipt && (
              <Action.OpenInBrowser
                title="Open Receipt"
                icon={Icon.Paperclip}
                url={receipt.url}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Amount"
              content={formatSignedCurrency(transaction.amount)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title={`Copy ${role}`}
              content={name}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            <Action.CopyToClipboard
              title="Copy as Text"
              content={transactionAsText(transaction, accountName, cardLabel)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
            <Action.CopyToClipboard
              title="Copy Transaction ID"
              content={transaction.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={showingSidebar ? "Hide Sidebar" : "Show Sidebar"}
              icon={Icon.AppWindowSidebarRight}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
              onAction={onToggleSidebar}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title={`All ${exportRows.length} Visible`}>
            <ExportTransactionsSubmenu filenameBase={exportName} rows={exportRows} />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
