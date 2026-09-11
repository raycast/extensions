import {
  Action,
  ActionPanel,
  Icon,
  List,
  LocalStorage,
  environment,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getAccountSet,
  getPrefs,
  getThemeColors,
  SimpleFinTransaction,
  formatAmount,
  formatDate,
  ThemeColor,
} from "./simplefin";

function transactionDate(
  txn: SimpleFinTransaction,
  dateFormat: string,
): string {
  const epoch = txn.transacted_at ?? txn.posted;
  return formatDate(epoch, dateFormat);
}

export default function Command() {
  const prefs = getPrefs();
  const defaultCurrency = prefs.prefDefaultCurrency;
  const { posColor, negColor } = getThemeColors(prefs);

  const { data, isLoading } = usePromise(async () => {
    const accountSet = await getAccountSet(
      environment.launchType === "background",
    );
    const settings = await LocalStorage.allItems<Record<string, string>>();
    return { ...accountSet, settings };
  });

  const accounts = data?.accounts ?? [];
  const settings = data?.settings ?? {};
  const dateFormat = prefs.prefDateFormat || "MM/DD";

  const visibleAccounts = accounts.filter(
    (a) => settings[`hide_${a.id}`] !== "true",
  );

  const allTxns: (SimpleFinTransaction & {
    accountName: string;
    currency: string;
  })[] = [];
  for (const acc of visibleAccounts) {
    const displayName = settings[acc.id] || acc.name;
    for (const t of acc.transactions ?? []) {
      allTxns.push({
        ...t,
        accountName: displayName,
        currency: acc.currency,
      });
    }
  }
  allTxns.sort(
    (a, b) => (b.transacted_at ?? b.posted) - (a.transacted_at ?? a.posted),
  );

  // Show all transactions (List is virtualized)
  const displayTxns = allTxns;

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
    const sizeBytes = Buffer.byteLength(JSON.stringify(accounts));
    const sizeKb = (sizeBytes / 1024).toFixed(1) + " KB";

    await showToast({
      style: Toast.Style.Success,
      title: "Archive Stats",
      message: `${totalTxns} transactions • ${days} days • ${sizeKb}`,
    });
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter transactions...">
      {displayTxns.map((txn) => {
        const amount = Number.parseFloat(txn.amount);
        const dateStr = transactionDate(txn, dateFormat);
        const title = (txn.payee || txn.description || "Transaction").trim();
        const formattedAmount = formatAmount(
          txn.amount,
          txn.currency,
          defaultCurrency,
        );
        const color: ThemeColor = amount < 0 ? negColor : posColor;

        return (
          <List.Item
            key={`${txn.accountName}-${txn.id}`}
            title={dateStr}
            subtitle={title}
            keywords={[formattedAmount, txn.amount, txn.accountName]}
            icon={{
              source: amount < 0 ? Icon.ArrowDown : Icon.ArrowUp,
              tintColor: color,
            }}
            accessories={[
              { text: txn.accountName, icon: Icon.Wallet },
              { tag: { value: formattedAmount, color } },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Transaction Details"
                  content={`${dateStr} | ${txn.accountName} | ${title} | ${formattedAmount}`}
                />
                <Action.CopyToClipboard
                  title="Copy Amount"
                  content={formattedAmount}
                />
                <Action.CopyToClipboard
                  title="Copy Description"
                  content={title}
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
      })}
    </List>
  );
}
