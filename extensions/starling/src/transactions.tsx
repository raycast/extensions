import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { MissingTokenView } from "./components/MissingTokenView";
import {
  accountDisplayName,
  formatAmount,
  formatDateTime,
  formatRelativeDate,
  statusColor,
  statusText,
} from "./lib/format";
import { showStarlingErrorToast } from "./lib/errors";
import { getResolvedPreferences } from "./lib/preferences";
import { getTransactionsAcrossAccountsInWindow, updateTransactionNote } from "./lib/starling";
import { StarlingFeedItem } from "./lib/types";

interface TransactionNoteFormProps {
  accountUid: string;
  categoryUid: string;
  feedItemUid: string;
  initialNote?: string;
}

interface TransactionNoteFormValues {
  note: string;
}

type TransactionRecord = Awaited<ReturnType<typeof getTransactionsAcrossAccountsInWindow>>[number];

function transactionTimestamp(item: StarlingFeedItem): number {
  return new Date(item.transactionTime ?? item.settlementTime ?? item.updatedAt ?? 0).getTime();
}

function windowBounds(anchorMs: number, windowDays: number, windowIndex: number): { min: string; max: string } {
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const maxMs = anchorMs - windowIndex * windowMs;
  const minMs = maxMs - windowMs;
  return {
    min: new Date(minMs).toISOString(),
    max: new Date(maxMs).toISOString(),
  };
}

function mergeTransactions(existing: TransactionRecord[], incoming: TransactionRecord[]): TransactionRecord[] {
  const deduped = new Map<string, TransactionRecord>();

  for (const record of [...existing, ...incoming]) {
    const key = `${record.account.accountUid}-${record.item.feedItemUid}`;
    deduped.set(key, record);
  }

  return Array.from(deduped.values()).sort((a, b) => transactionTimestamp(b.item) - transactionTimestamp(a.item));
}

function transactionSearchFields(record: TransactionRecord): string[] {
  const { account, item } = record;
  return [
    transactionTitle(item),
    item.reference || "",
    item.counterPartyName || "",
    item.counterPartySubEntityName || "",
    item.spendingCategory || "",
    account.accountUid,
    accountDisplayName(account),
  ];
}

function UpdateTransactionNoteForm(props: TransactionNoteFormProps) {
  const { accountUid, categoryUid, feedItemUid, initialNote } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(values: TransactionNoteFormValues) {
    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating transaction note",
    });

    try {
      await updateTransactionNote(accountUid, categoryUid, feedItemUid, values.note);
      toast.style = Toast.Style.Success;
      toast.title = "Note updated";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update note";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Edit Transaction Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Note" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Transaction" text="Add a note to help you remember this payment." />
      <Form.TextArea
        id="note"
        title="Note"
        defaultValue={initialNote}
        placeholder="Write a note attached to this transaction"
      />
    </Form>
  );
}

function transactionTitle(item: StarlingFeedItem): string {
  return item.counterPartyName || item.reference || item.counterPartySubEntityName || "Transaction";
}

function transactionDirectionText(direction: string | undefined): string {
  if (!direction) return "Unknown";
  const normalized = direction.toUpperCase();
  if (normalized === "IN") return "Money in";
  if (normalized === "OUT") return "Money out";
  return direction;
}

function transactionDirectionIcon(direction: string | undefined): List.Item.Props["icon"] {
  if (!direction) return Icon.Receipt;
  const normalized = direction.toUpperCase();
  if (normalized === "OUT") {
    return { source: Icon.ArrowUp, tintColor: statusColor("FAILED") };
  }
  if (normalized === "IN") {
    return { source: Icon.ArrowDown, tintColor: statusColor("SETTLED") };
  }
  return Icon.Receipt;
}

function transactionDetailMarkdown(record: TransactionRecord, amountText: string, dateText: string): string {
  const { account, item } = record;

  return [
    `# ${transactionTitle(item)}`,
    "",
    `**Amount:** ${amountText}`,
    "",
    `**Date:** ${dateText}`,
    "",
    `**Status:** ${statusText(item.status)}`,
    "",
    `**Direction:** ${transactionDirectionText(item.direction)}`,
    "",
    `**Account:** ${accountDisplayName(account)}`,
    "",
    `**Reference:** ${item.reference || "No reference"}`,
    "",
    `**Merchant:** ${item.counterPartyName || item.counterPartySubEntityName || "Unknown"}`,
  ].join("\n");
}

function TransactionDetail(props: {
  record: TransactionRecord;
  amountText: string;
  dateText: string;
  relativeText: string;
  isDemoData: boolean;
  onReload: () => void;
  onLoadMore: () => void;
}) {
  const { record, amountText, dateText, relativeText, isDemoData, onReload, onLoadMore } = props;
  const { account, categoryUid, item } = record;

  return (
    <Detail
      navigationTitle={transactionTitle(item)}
      markdown={transactionDetailMarkdown(record, amountText, dateText)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="When" text={relativeText || dateText} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Category" text={item.spendingCategory || "-"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Source" text={item.source || "-"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!isDemoData ? (
            <Action.Push
              title="Edit Note"
              icon={Icon.Pencil}
              target={
                <UpdateTransactionNoteForm
                  accountUid={account.accountUid}
                  categoryUid={item.categoryUid ?? categoryUid}
                  feedItemUid={item.feedItemUid}
                />
              }
            />
          ) : null}
          <Action
            title="Load More Transactions"
            icon={Icon.Download}
            onAction={onLoadMore}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action title="Reload Transactions" icon={Icon.ArrowClockwise} onAction={onReload} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function TransactionsCommand() {
  const preferences = getResolvedPreferences();
  const isDemoData = preferences.useDemoData;
  const windowDays = preferences.transactionLookbackDays;
  const maxTransactionsPerAccount = preferences.maxTransactions;
  const [searchText, setSearchText] = useState("");
  const [anchorMs, setAnchorMs] = useState<number>(() => Date.now());
  const [windowsLoaded, setWindowsLoaded] = useState(0);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<unknown>();

  const fetchWindow = useCallback(
    async (anchor: number, windowIndex: number): Promise<TransactionRecord[]> => {
      const { min, max } = windowBounds(anchor, windowDays, windowIndex);
      return getTransactionsAcrossAccountsInWindow({
        minTimestamp: min,
        maxTimestamp: max,
        maxTransactionsPerAccount,
      });
    },
    [windowDays, maxTransactionsPerAccount],
  );

  const reloadTransactions = useCallback(async () => {
    const nextAnchor = Date.now();
    setIsLoading(true);
    setIsLoadingMore(false);
    setLoadError(undefined);

    try {
      const initial = await fetchWindow(nextAnchor, 0);
      setAnchorMs(nextAnchor);
      setTransactions(initial);
      setWindowsLoaded(1);
    } catch (error) {
      setLoadError(error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchWindow]);

  useEffect(() => {
    void reloadTransactions();
  }, [reloadTransactions]);

  useEffect(() => {
    if (loadError) {
      void showStarlingErrorToast(loadError, "Failed to load transactions");
    }
  }, [loadError]);

  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredTransactions =
    normalizedSearch.length === 0
      ? transactions
      : transactions.filter((record) =>
          transactionSearchFields(record).some((field) => field.toLowerCase().includes(normalizedSearch)),
        );
  const canLoadMore = !isLoading && !isLoadingMore;
  const loadedDays = windowDays * Math.max(windowsLoaded, 1);

  async function loadMoreTransactions() {
    if (!canLoadMore) return;
    const nextWindowIndex = windowsLoaded;
    setIsLoadingMore(true);
    setLoadError(undefined);

    try {
      const nextChunk = await fetchWindow(anchorMs, nextWindowIndex);
      setTransactions((current) => mergeTransactions(current, nextChunk));
      setWindowsLoaded((current) => current + 1);
    } catch (error) {
      setLoadError(error);
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <List
      isLoading={isLoading || isLoadingMore}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by merchant, reference, or category"
      actions={
        <ActionPanel>
          <Action
            title="Load More Transactions"
            icon={Icon.Download}
            onAction={() => void loadMoreTransactions()}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action title="Reload" icon={Icon.ArrowClockwise} onAction={() => void reloadTransactions()} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <List.Section title="Transactions" subtitle={`${filteredTransactions.length} • ${loadedDays} days`}>
        {filteredTransactions.map(({ account, categoryUid, item }) => {
          const amount = item.amount ?? item.sourceAmount;
          const amountText = formatAmount(amount, account.currency ?? preferences.defaultCurrency);
          const dateText = formatDateTime(item.transactionTime ?? item.settlementTime ?? item.updatedAt);
          const relativeText = formatRelativeDate(item.transactionTime ?? item.settlementTime ?? item.updatedAt);

          const accessories: List.Item.Accessory[] = [
            {
              tag: {
                value: amountText,
                color: item.direction?.toUpperCase() === "OUT" ? statusColor("FAILED") : statusColor("SETTLED"),
              },
            },
          ];

          return (
            <List.Item
              key={`${account.accountUid}-${item.feedItemUid}`}
              icon={transactionDirectionIcon(item.direction)}
              title={transactionTitle(item)}
              subtitle={relativeText || undefined}
              keywords={[
                item.reference || "",
                item.counterPartyName || "",
                item.spendingCategory || "",
                account.accountUid,
              ]}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    icon={Icon.Eye}
                    target={
                      <TransactionDetail
                        record={{ account, categoryUid, item }}
                        amountText={amountText}
                        dateText={dateText}
                        relativeText={relativeText}
                        isDemoData={isDemoData}
                        onReload={() => void reloadTransactions()}
                        onLoadMore={() => void loadMoreTransactions()}
                      />
                    }
                  />
                  {!isDemoData ? (
                    <Action.Push
                      title="Edit Note"
                      icon={Icon.Pencil}
                      target={
                        <UpdateTransactionNoteForm
                          accountUid={account.accountUid}
                          categoryUid={item.categoryUid ?? categoryUid}
                          feedItemUid={item.feedItemUid}
                        />
                      }
                    />
                  ) : null}
                  <Action
                    title="Load More Transactions"
                    icon={Icon.Download}
                    onAction={() => void loadMoreTransactions()}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                  />
                  <Action title="Reload" icon={Icon.ArrowClockwise} onAction={() => void reloadTransactions()} />
                  <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          );
        })}
        <List.Item
          key="load-more-transactions"
          icon={Icon.Download}
          title="Load More Transactions"
          actions={
            <ActionPanel>
              <Action
                title="Load More Transactions"
                icon={Icon.Download}
                onAction={() => void loadMoreTransactions()}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
              <Action title="Reload" icon={Icon.ArrowClockwise} onAction={() => void reloadTransactions()} />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

export default function Command() {
  const preferences = getResolvedPreferences();

  if (!preferences.personalAccessToken && !preferences.useDemoData) {
    return <MissingTokenView />;
  }

  return <TransactionsCommand />;
}
