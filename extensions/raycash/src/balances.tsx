import {
  Clipboard,
  Color,
  Icon,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  environment,
  open,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  SimpleFinAccount,
  SimpleFinTransaction,
  ThemeColor,
  formatAmount,
  getAccountSet,
  getPrefs,
  getThemeColors,
  signedBalance,
  formatDate,
  sortAccountsAndOrgs,
} from "./simplefin";

function transactionTitle(txn: SimpleFinTransaction): string {
  const label = (txn.payee || txn.description || "Transaction").trim();
  return label.length > 44 ? `${label.slice(0, 43)}…` : label;
}

function transactionDate(
  txn: SimpleFinTransaction,
  dateFormat: string,
): string {
  const epoch = txn.transacted_at ?? txn.posted;
  return formatDate(epoch, dateFormat);
}

function accountIcon(
  amount: number,
  posColor: ThemeColor,
  negColor: ThemeColor,
) {
  if (amount < 0) return { source: Icon.Minus, tintColor: negColor };
  return { source: Icon.Plus, tintColor: posColor };
}

function TransactionRow({
  txn,
  currency,
  dateFormat,
  accountName,
  defaultCurrency,
  posColor = Color.Green,
  negColor = Color.Red,
}: {
  txn: SimpleFinTransaction;
  currency: string;
  dateFormat: string;
  accountName?: string;
  defaultCurrency?: string;
  posColor?: ThemeColor;
  negColor?: ThemeColor;
}) {
  const amount = Number.parseFloat(txn.amount);
  const date = transactionDate(txn, dateFormat);
  const formatted = formatAmount(txn.amount, currency, defaultCurrency);
  return (
    <MenuBarExtra.Item
      subtitle={
        accountName
          ? `${accountName}  ·  ${transactionTitle(txn)}`
          : transactionTitle(txn)
      }
      title={`${date} • ${formatted}${txn.pending ? " (pending)" : ""}`}
      icon={{
        source: amount < 0 ? Icon.ArrowDown : Icon.ArrowUp,
        tintColor: amount < 0 ? negColor : posColor,
      }}
      tooltip={txn.memo || txn.description || undefined}
      onAction={async () => {
        await Clipboard.copy(`${transactionTitle(txn)} ${formatted}`);
        await showHUD("Copied transaction");
      }}
    />
  );
}

function AccountSubmenu({
  account,
  settings,
  customName,
  txnLimit,
  txnDays,
  dateFormat,
  defaultCurrency,
  posColor,
  negColor,
}: {
  account: SimpleFinAccount;
  settings: Record<string, string>;
  customName?: string;
  txnLimit: number;
  txnDays?: number;
  dateFormat: string;
  defaultCurrency?: string;
  posColor: ThemeColor;
  negColor: ThemeColor;
}) {
  const balance = signedBalance(account, settings);
  const label = formatAmount(balance, account.currency, defaultCurrency);
  const displayName = customName || account.name;
  const available = account["available-balance"];

  let txns = (account.transactions ?? []).slice();
  txns.sort(
    (a, b) => (b.transacted_at ?? b.posted) - (a.transacted_at ?? a.posted),
  );

  if (txnDays && txnDays > 0) {
    const cutoff = Date.now() / 1000 - txnDays * 86400;
    txns = txns.filter((t) => (t.transacted_at ?? t.posted) >= cutoff);
  }

  const displayedTxns =
    txnLimit && txnLimit > 0 ? txns.slice(0, txnLimit) : txns;
  const moreTxns = txnLimit && txnLimit > 0 ? txns.slice(txnLimit) : [];

  return (
    <MenuBarExtra.Submenu
      title={`${displayName}:  ${label}`}
      icon={accountIcon(balance, posColor, negColor)}
    >
      {available && Number(available) !== 0 && available !== account.balance ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`Available ${formatAmount(available, account.currency, defaultCurrency)}`}
            icon={Icon.Coins}
            onAction={async () => {
              const availFormatted = formatAmount(
                available,
                account.currency,
                defaultCurrency,
              );
              await Clipboard.copy(availFormatted);
              await showHUD(`Copied ${availFormatted}`);
            }}
          />
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section
        title={txns.length ? "Recent Transactions" : undefined}
      >
        {txns.length === 0 ? (
          <MenuBarExtra.Item
            title="No transactions in range"
            icon={Icon.Tray}
            onAction={() => undefined}
          />
        ) : (
          <>
            {displayedTxns.map((txn) => (
              <TransactionRow
                key={txn.id}
                txn={txn}
                currency={account.currency}
                dateFormat={dateFormat}
                defaultCurrency={defaultCurrency}
                posColor={posColor}
                negColor={negColor}
              />
            ))}
            {moreTxns.length > 0 ? (
              <MenuBarExtra.Submenu title="More" icon={Icon.Ellipsis}>
                {moreTxns.map((txn) => (
                  <TransactionRow
                    key={txn.id}
                    txn={txn}
                    currency={account.currency}
                    dateFormat={dateFormat}
                    defaultCurrency={defaultCurrency}
                    posColor={posColor}
                    negColor={negColor}
                  />
                ))}
              </MenuBarExtra.Submenu>
            ) : null}
          </>
        )}
      </MenuBarExtra.Section>

      {account.org?.domain ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`Open ${account.org.domain}`}
            icon={Icon.Globe}
            onAction={() => open(`https://${account.org.domain}`)}
          />
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra.Submenu>
  );
}

export default function Command() {
  const prefs = getPrefs();
  const { data, isLoading, error } = usePromise(async () => {
    const accountSet = await getAccountSet(
      environment.launchType === LaunchType.Background,
    );
    const settings = await LocalStorage.allItems<Record<string, string>>();
    return { ...accountSet, settings };
  });

  const accounts = data?.accounts ?? [];
  const settings = data?.settings ?? {};

  const txnLimit = Number(prefs.prefAccountTxn || "8");
  const globalTxnCount = prefs.prefGlobalTxnCount
    ? Number(prefs.prefGlobalTxnCount)
    : undefined;
  const globalTxnDays = prefs.prefGlobalTxnDays
    ? Number(prefs.prefGlobalTxnDays)
    : undefined;
  const titleMode = prefs.prefTitleMode || "total";
  const dateFormat = prefs.prefDateFormat || "MM/DD";
  const defaultCurrency = prefs.prefDefaultCurrency;
  const { posColor, negColor } = getThemeColors(prefs);

  const visibleAccounts = accounts.filter(
    (a) => settings[`hide_${a.id}`] !== "true",
  );

  const orgEntries = sortAccountsAndOrgs(visibleAccounts, settings);

  const net = visibleAccounts.reduce((sum, a) => {
    if (settings[`exclude_${a.id}`] === "true") return sum;
    return sum + signedBalance(a, settings);
  }, 0);

  const netLabel = formatAmount(
    net,
    visibleAccounts[0]?.currency ?? "USD",
    defaultCurrency,
  );

  const title = error
    ? "—"
    : titleMode === "none"
      ? undefined
      : visibleAccounts.length
        ? netLabel
        : undefined;

  return (
    <MenuBarExtra
      icon={
        error ? { source: Icon.Warning, tintColor: Color.Red } : Icon.Wallet
      }
      title={title}
      isLoading={isLoading}
      tooltip="Raycash"
    >
      {error ? (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item
            title={error.message}
            icon={Icon.ExclamationMark}
            onAction={() => openExtensionPreferences()}
          />
        </MenuBarExtra.Section>
      ) : null}

      {data?.errors?.length
        ? (() => {
            const filteredErrors = data.errors.filter(
              (e) => !e.includes("45 days"),
            );
            if (filteredErrors.length === 0) return null;
            return (
              <MenuBarExtra.Section title="Institution Warnings">
                {filteredErrors.map((message, i) => (
                  <MenuBarExtra.Item
                    key={i}
                    title={message}
                    icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                    onAction={() => open("https://beta-bridge.simplefin.org/")}
                  />
                ))}
              </MenuBarExtra.Section>
            );
          })()
        : null}

      {orgEntries.map(({ orgKey, orgAccounts }) => (
        <MenuBarExtra.Section
          key={orgKey}
          title={settings[`org_${orgKey}`] || orgKey}
        >
          {orgAccounts.map((account) => (
            <AccountSubmenu
              key={account.id}
              account={account}
              settings={settings}
              customName={settings[account.id]}
              txnLimit={txnLimit}
              dateFormat={dateFormat}
              defaultCurrency={defaultCurrency}
              posColor={posColor}
              negColor={negColor}
            />
          ))}
        </MenuBarExtra.Section>
      ))}

      {visibleAccounts.length && titleMode === "none" ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`Net Total ${netLabel}`}
            icon={{
              source: Icon.Calculator,
              tintColor: net < 0 ? negColor : posColor,
            }}
            onAction={async () => {
              await Clipboard.copy(netLabel);
              await showHUD(`Copied ${netLabel}`);
            }}
          />
        </MenuBarExtra.Section>
      ) : null}

      {(() => {
        let allTxns: (SimpleFinTransaction & {
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
          (a, b) =>
            (b.transacted_at ?? b.posted) - (a.transacted_at ?? a.posted),
        );

        if (globalTxnDays && globalTxnDays > 0) {
          const cutoff = Date.now() / 1000 - globalTxnDays * 86400;
          allTxns = allTxns.filter(
            (t) => (t.transacted_at ?? t.posted) >= cutoff,
          );
        }

        if (allTxns.length === 0) return null;

        const limit =
          globalTxnCount && globalTxnCount > 0 ? globalTxnCount : 15;
        const displayedGlobalTxns = allTxns.slice(0, limit);
        const moreGlobalTxns = allTxns.slice(limit);

        return (
          <MenuBarExtra.Section title="Recent Transactions">
            {displayedGlobalTxns.map((txn) => (
              <TransactionRow
                key={`${txn.accountName}-${txn.id}`}
                txn={txn}
                currency={txn.currency}
                dateFormat={dateFormat}
                accountName={txn.accountName}
                defaultCurrency={defaultCurrency}
                posColor={posColor}
                negColor={negColor}
              />
            ))}
            {moreGlobalTxns.length > 0 ? (
              <MenuBarExtra.Submenu title="More" icon={Icon.Ellipsis}>
                {moreGlobalTxns.map((txn) => (
                  <TransactionRow
                    key={`${txn.accountName}-${txn.id}`}
                    txn={txn}
                    currency={txn.currency}
                    dateFormat={dateFormat}
                    accountName={txn.accountName}
                    defaultCurrency={defaultCurrency}
                    posColor={posColor}
                    negColor={negColor}
                  />
                ))}
              </MenuBarExtra.Submenu>
            ) : null}
          </MenuBarExtra.Section>
        );
      })()}
    </MenuBarExtra>
  );
}
