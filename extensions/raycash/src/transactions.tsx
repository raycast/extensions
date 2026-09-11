import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  environment,
  openExtensionPreferences,
  showToast,
  updateCommandMetadata,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  DEFAULT_STRIP_STRINGS,
  STRIP_STORAGE_KEY,
  DETAIL_STORAGE_KEY,
  SimpleFinTransaction,
  ThemeColor,
  formatAmount,
  formatSignedAmount,
  searchScore,
  formatDate,
  formatTransactionDetail,
  getAccountSet,
  getPrefs,
  getThemeColors,
  groupByDay,
  payeeName,
} from "./simplefin";

type Txn = SimpleFinTransaction & { accountName: string; currency: string };

/**
 * Editor for the noise-stripping list.
 *
 * This used to be an extension preference, but a single-line textfield is a
 * poor home for ~40 comma-separated tokens. Here it gets a real text area, the
 * built-in list is visible rather than implied, and a reset is one action away.
 */
function StripListForm({
  current,
  onSaved,
}: {
  current: string;
  onSaved: (value: string) => void;
}) {
  const { pop } = useNavigation();

  const save = async (value: string) => {
    const trimmed = value.trim();
    if (trimmed) await LocalStorage.setItem(STRIP_STORAGE_KEY, trimmed);
    else await LocalStorage.removeItem(STRIP_STORAGE_KEY);
    onSaved(trimmed);
    await showToast({ style: Toast.Style.Success, title: "Strip List Saved" });
    pop();
  };

  return (
    <Form
      navigationTitle="Strings to Strip"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={(values) => save(String(values.strip ?? ""))}
          />
          <Action
            title="Reset to Built-in Defaults"
            icon={Icon.ArrowCounterClockwise}
            style={Action.Style.Destructive}
            onAction={() => save("")}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          "Comma-separated text removed from transaction names. Matching is " +
          "case-insensitive, so lowercase is fine.\n\n" +
          "Entries are LITERAL text, not patterns — an asterisk here means a " +
          "real asterisk character.\n\n" +
          "Processor tags like SQ *, TST*, PP* and PAYPAL * do not need listing: " +
          "any short tag followed by an asterisk at the START of a name is " +
          "removed automatically, which is why this list is short. A merchant " +
          "with an asterisk mid-name (AMAZON.COM*RT4G51) is left alone.\n\n" +
          "This list is the whole list — edit freely, or reset to restore these defaults."
        }
      />
      <Form.TextArea
        id="strip"
        title="Strip List"
        placeholder={DEFAULT_STRIP_STRINGS}
        defaultValue={current || DEFAULT_STRIP_STRINGS}
      />
    </Form>
  );
}

function TransactionDetail({
  txn,
  stripStrings,
  defaultCurrency,
}: {
  txn: Txn;
  stripStrings?: string;
  defaultCurrency?: string;
  dateFormat?: string;
}) {
  const amount = Number.parseFloat(txn.amount);
  const formatted = formatAmount(txn.amount, txn.currency, defaultCurrency);
  const epoch = txn.transacted_at ?? txn.posted;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Amount"
            text={amount < 0 ? `-${formatted}` : formatted}
            icon={{
              source: amount < 0 ? Icon.ArrowDown : Icon.ArrowUp,
              tintColor: undefined,
            }}
          />
          <List.Item.Detail.Metadata.Label
            title="Payee"
            text={payeeName(txn, stripStrings)}
          />
          <List.Item.Detail.Metadata.Label
            title="Account"
            text={txn.accountName}
          />
          <List.Item.Detail.Metadata.Separator />
          {/* SimpleFIN sends two dates, not three: `transacted_at` (when it
              happened) and `posted` (when the bank settled it). "Date" is the
              transaction date; posted only earns a row when it differs. */}
          <List.Item.Detail.Metadata.Label
            title="Date"
            text={formatDate(epoch, "EEE, MMM d, yyyy")}
          />
          {txn.transacted_at && txn.posted !== txn.transacted_at ? (
            <List.Item.Detail.Metadata.Label
              title="Posted"
              text={formatDate(txn.posted, "EEE, MMM d, yyyy")}
            />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          {/* The raw SimpleFIN fields, named individually — "Original" was
              really three of them stacked, which read as one value. Empty
              fields are omitted rather than shown as a dash. */}
          {txn.description?.trim() ? (
            <List.Item.Detail.Metadata.Label
              title="Description"
              text={txn.description.trim()}
            />
          ) : null}
          {txn.payee?.trim() &&
          txn.payee.trim() !== payeeName(txn, stripStrings) ? (
            <List.Item.Detail.Metadata.Label
              title="Payee (raw)"
              text={txn.payee.trim()}
            />
          ) : null}
          {txn.memo?.trim() ? (
            <List.Item.Detail.Metadata.Label
              title="Memo"
              text={txn.memo.trim()}
            />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Currency"
            text={txn.currency || "USD"}
          />
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={txn.pending ? "Pending" : "Posted"}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="ID" text={txn.id} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const prefs = getPrefs();
  const defaultCurrency = prefs.prefDefaultCurrency;
  const dateFormat = prefs.prefDateFormat;
  const groupByDate = !!prefs.prefGroupByDate;
  const { posColor, negColor } = getThemeColors(prefs);

  const [detailOverride, setDetailOverride] = useState<boolean | undefined>();
  const [query, setQuery] = useState("");
  const [stripOverride, setStripOverride] = useState<string | undefined>();

  const { data, isLoading, error } = usePromise(async () => {
    const accountSet = await getAccountSet(
      environment.launchType === "background",
    );
    const settings = await LocalStorage.allItems<Record<string, string>>();
    return { ...accountSet, settings };
  });

  const accounts = data?.accounts ?? [];
  const settings = data?.settings ?? {};
  const stripStrings = stripOverride ?? settings[STRIP_STORAGE_KEY];

  // Falls back to the stored value until the user toggles, so the pane picks
  // up its previous state as soon as settings load rather than flashing shut.
  const showingDetail =
    detailOverride ?? settings[DETAIL_STORAGE_KEY] === "true";

  const toggleDetail = async () => {
    const next = !showingDetail;
    setDetailOverride(next);
    await LocalStorage.setItem(DETAIL_STORAGE_KEY, String(next));
  };

  const visibleAccounts = accounts.filter(
    (a) => settings[`hide_${a.id}`] !== "true",
  );

  const allTxns: Txn[] = [];
  for (const acc of visibleAccounts) {
    const displayName = settings[acc.id] || acc.name;
    for (const t of acc.transactions ?? []) {
      allTxns.push({ ...t, accountName: displayName, currency: acc.currency });
    }
  }
  allTxns.sort(
    (a, b) => (b.transacted_at ?? b.posted) - (a.transacted_at ?? a.posted),
  );

  useEffect(() => {
    if (!data) return;
    const now = new Date();
    const startOfToday =
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() /
      1000;
    const endOfToday = startOfToday + 86400;

    const todayTxns = allTxns.filter((t) => {
      const ts = t.transacted_at ?? t.posted;
      return ts >= startOfToday && ts < endOfToday;
    });

    // Signed, and one total per currency: unlike currencies cannot be summed.
    const totals = new Map<string, number>();
    for (const t of todayTxns) {
      const sum = totals.get(t.currency) ?? 0;
      totals.set(t.currency, sum + (Number.parseFloat(t.amount) || 0));
    }
    if (totals.size === 0) totals.set(visibleAccounts[0]?.currency ?? "USD", 0);
    const hideSymbol = totals.size > 1 ? undefined : defaultCurrency;
    const amountStr = Array.from(totals, ([currency, sum]) =>
      formatSignedAmount(sum, currency, hideSymbol),
    ).join("  ");

    updateCommandMetadata({ subtitle: `Today: ${amountStr}` });
  }, [data, defaultCurrency]);

  const showArchiveStats = async () => {
    let totalTxns = 0;
    let oldestTs = Infinity;
    for (const acc of accounts) {
      for (const t of acc.transactions ?? []) {
        totalTxns++;
        const ts = t.transacted_at ?? t.posted;
        if (ts < oldestTs) oldestTs = ts;
      }
    }
    const days =
      oldestTs === Infinity
        ? 0
        : Math.round((Date.now() / 1000 - oldestTs) / 86400);
    const sizeKb =
      (Buffer.byteLength(JSON.stringify(accounts)) / 1024).toFixed(1) + " KB";
    await showToast({
      style: Toast.Style.Success,
      title: "Archive Stats",
      message: `${totalTxns} transactions • ${days} days • ${sizeKb}`,
    });
  };

  const renderItem = (txn: Txn, { withDate }: { withDate: boolean }) => {
    const amount = Number.parseFloat(txn.amount);
    const dateStr = formatDate(txn.transacted_at ?? txn.posted, dateFormat);
    const raw = (txn.payee || txn.description || "Transaction").trim();
    const title = payeeName(txn, stripStrings);
    const formattedAmount = formatAmount(
      txn.amount,
      txn.currency,
      defaultCurrency,
    );
    const color: ThemeColor = amount < 0 ? negColor : posColor;
    const details = formatTransactionDetail(txn, {
      accountName: txn.accountName,
      currency: txn.currency,
      defaultCurrency,
      dateFormat,
      stripStrings,
    });

    return (
      <List.Item
        key={`${txn.accountName}-${txn.id}`}
        // With a day heading above, repeating the date on every row is noise.
        title={withDate ? dateStr : title}
        subtitle={withDate ? title : undefined}
        // Searching still has to find what is no longer displayed.
        keywords={[formattedAmount, txn.amount, txn.accountName, raw, dateStr]}
        icon={{
          source: amount < 0 ? Icon.ArrowDown : Icon.ArrowUp,
          tintColor: color,
        }}
        detail={
          showingDetail ? (
            <TransactionDetail
              txn={txn}
              stripStrings={stripStrings}
              defaultCurrency={defaultCurrency}
              dateFormat={dateFormat}
            />
          ) : undefined
        }
        accessories={
          showingDetail
            ? undefined
            : [
                { text: txn.accountName, icon: Icon.Wallet },
                { tag: { value: formattedAmount, color } },
              ]
        }
        actions={
          <ActionPanel>
            <Action
              title={showingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              onAction={toggleDetail}
            />
            <Action.CopyToClipboard
              title="Copy Transaction Details"
              content={details}
            />
            <Action.CopyToClipboard
              title="Copy Amount"
              content={formatSignedAmount(
                txn.amount,
                txn.currency,
                defaultCurrency,
              )}
            />
            <Action.CopyToClipboard title="Copy Description" content={title} />
            <Action.CopyToClipboard
              title="Copy Original Description"
              content={raw}
            />
            <Action.CopyToClipboard
              title="Copy Raw JSON"
              icon={Icon.Code}
              content={JSON.stringify(
                Object.fromEntries(
                  Object.entries(txn).filter(
                    ([k]) => k !== "accountName" && k !== "currency",
                  ),
                ),
                null,
                2,
              )}
            />
            <Action.Push
              title="Edit Strip List"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              target={
                <StripListForm
                  current={stripStrings ?? ""}
                  onSaved={setStripOverride}
                />
              }
            />
            <Action
              title="Show Archive Stats"
              icon={Icon.Info}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={showArchiveStats}
            />
          </ActionPanel>
        }
      />
    );
  };

  // Rank matches ourselves. Raycast's filter is a subsequence match, so "123"
  // scored "18.23" the same as "123.74"; searchScore puts literal hits first.
  const ranked = query.trim()
    ? allTxns
        .map((txn) => ({
          txn,
          score: searchScore(
            [
              formatAmount(txn.amount, txn.currency, defaultCurrency),
              txn.amount,
              payeeName(txn, stripStrings),
              txn.payee,
              txn.description,
              txn.memo,
              txn.accountName,
              formatDate(txn.transacted_at ?? txn.posted, dateFormat),
            ],
            query,
          ),
        }))
        .filter((r) => r.score > 0)
        // Ties keep the newest first, which is the order without a query.
        .sort((a, b) => b.score - a.score)
        .map((r) => r.txn)
    : null;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && allTxns.length > 0}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search amount, payee, account, date..."
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Error"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : allTxns.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Coins} title="No Transactions Found" />
      ) : null}

      {ranked
        ? ranked.map((txn) => renderItem(txn, { withDate: true }))
        : /* Both modes group by day; grouped mode names the day, flat mode
             leaves the section untitled so it reads as a divider. */
          groupByDay(allTxns, dateFormat).map((group) => (
            <List.Section
              key={group.key}
              title={groupByDate ? group.heading : undefined}
              subtitle={groupByDate ? `${group.items.length}` : undefined}
            >
              {group.items.map((txn) =>
                renderItem(txn, { withDate: !groupByDate }),
              )}
            </List.Section>
          ))}
    </List>
  );
}
