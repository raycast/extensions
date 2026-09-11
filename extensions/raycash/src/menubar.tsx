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
  AmountWidth,
  SimpleFinAccount,
  SimpleFinTransaction,
  ThemeColor,
  formatAmount,
  formatTransactionDetail,
  getAccountSet,
  getPrefs,
  getThemeColors,
  groupByDay,
  maxAmountWidth,
  padAmount,
  renderTemplate,
  measureColumns,
  tooltipExtra,
  rowExtra,
  DEFAULT_ROW_TEMPLATE,
  ColumnWidths,
  signedBalance,
  STRIP_STORAGE_KEY,
  sortAccountsAndOrgs,
  formatRefreshTime,
  formatSignedAmount,
  numberPref,
  totalsByCurrency,
} from "./simplefin";

const DEFAULT_POS = { light: "#0f0", dark: "#0f0" };
const DEFAULT_NEG = { light: "#f00", dark: "#f00" };

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
  accountName,
  showAccount,
  defaultCurrency,
  stripStrings,
  dateFormat,
  template,
  columns,
  posColor = DEFAULT_POS,
  negColor = DEFAULT_NEG,
}: {
  txn: SimpleFinTransaction;
  currency: string;
  accountName?: string;
  /** False inside an account submenu, where the account is already implied. */
  showAccount?: boolean;
  defaultCurrency?: string;
  stripStrings?: string;
  dateFormat?: string;
  template: string;
  columns?: ColumnWidths;
  posColor?: ThemeColor;
  negColor?: ThemeColor;
}) {
  const amount = Number.parseFloat(txn.amount);
  const ctx = {
    txn,
    accountName,
    currency,
    defaultCurrency,
    stripStrings,
    columns,
    dateFormat,
    showAccount,
  };

  // One string, no subtitle. The grey second column was the only thing an
  // alternate could not reproduce, so dropping it makes ⌥ render identically
  // to the normal row instead of appearing to flip.
  const title = renderTemplate(template, ctx);
  // Only what the row does not already say, so hovering adds rather than echoes.
  const extra = tooltipExtra(template, ctx);
  // ⌥ gets the same detail unlabelled and without the posted date.
  const expanded = rowExtra(template, ctx);

  const details = formatTransactionDetail(txn, {
    accountName,
    currency,
    defaultCurrency,
    dateFormat,
    stripStrings,
  });

  const icon = {
    source: amount < 0 ? Icon.ArrowDown : Icon.ArrowUp,
    tintColor: amount < 0 ? negColor : posColor,
  };

  const copy = async () => {
    await Clipboard.copy(details);
    await showHUD("Copied transaction");
  };

  return (
    <MenuBarExtra.Item
      title={title}
      icon={icon}
      tooltip={extra || undefined}
      onAction={copy}
      alternate={
        // An alternate renders `title` only and drops `subtitle`, so the
        // expanded row is necessarily one string and loses the grey/white
        // split. The leading text stays identical so the states line up.
        expanded ? (
          <MenuBarExtra.Item
            title={`${title}  ${extra.replace(/\n/g, "  ")}`}
            icon={icon}
            onAction={copy}
          />
        ) : undefined
      }
    />
  );
}

type TxnRenderOpts = {
  groupByDate: boolean;
  dateFormat?: string;
  defaultCurrency?: string;
  stripStrings?: string;
  template: string;
  columns?: ColumnWidths;
  posColor: ThemeColor;
  negColor: ThemeColor;
  accountName?: string;
  /** Fixed currency for a single account; omit when rows carry their own. */
  currency?: string;
  /** Prefix each row with its account name (used by the combined list). */
  withAccountName?: boolean;
};

/**
 * Renders transactions as a flat array of Sections.
 *
 * Grouped mode keeps today's rows visible and folds every earlier day into its
 * own submenu, so a week of history costs one row per day instead of dozens.
 *
 * Returns an array rather than a fragment on purpose: MenuBarExtra drops
 * Section titles when the sections are nested inside a fragment.
 */
function renderTxnSections<
  T extends SimpleFinTransaction & { accountName?: string; currency?: string },
>(txns: T[], opts: TxnRenderOpts) {
  const row = (txn: T) => (
    <TransactionRow
      key={`${txn.accountName ?? ""}-${txn.id}`}
      txn={txn}
      currency={opts.currency ?? txn.currency ?? "USD"}
      accountName={txn.accountName ?? opts.accountName}
      showAccount={opts.withAccountName !== false}
      defaultCurrency={opts.defaultCurrency}
      stripStrings={opts.stripStrings}
      dateFormat={opts.dateFormat}
      template={opts.template}
      columns={opts.columns}
      posColor={opts.posColor}
      negColor={opts.negColor}
    />
  );

  // Flat: every row carries its own date, and each day gets its own untitled
  // section, which the menu renders as a plain divider where the day changes.
  if (!opts.groupByDate) {
    return groupByDay(txns, opts.dateFormat).map((group, i) => (
      <MenuBarExtra.Section
        key={group.key}
        title={i === 0 ? "Recent Transactions" : undefined}
      >
        {group.items.map((txn) => row(txn))}
      </MenuBarExtra.Section>
    ));
  }

  const groups = groupByDay(txns, opts.dateFormat);
  const today = groups.filter((g) => g.heading === "Today");
  const earlier = groups.filter((g) => g.heading !== "Today");

  return [
    ...today.map((group) => (
      <MenuBarExtra.Section key={group.key} title={group.heading}>
        {group.items.map((txn) => row(txn))}
      </MenuBarExtra.Section>
    )),
    earlier.length ? (
      <MenuBarExtra.Section
        key="earlier"
        title={today.length ? undefined : "Recent Transactions"}
      >
        {earlier.map((group) => (
          <MenuBarExtra.Submenu
            key={group.key}
            title={`${group.heading}   (${group.items.length})`}
            icon={Icon.Calendar}
          >
            {group.items.map((txn) => row(txn))}
          </MenuBarExtra.Submenu>
        ))}
      </MenuBarExtra.Section>
    ) : null,
  ];
}

function AccountSubmenu({
  account,
  settings,
  customName,
  txnLimit,
  txnDays,
  dateFormat,
  groupByDate,
  template,
  aligned,
  defaultCurrency,
  stripStrings,
  balanceAlign,
  posColor,
  negColor,
}: {
  account: SimpleFinAccount;
  settings: Record<string, string>;
  customName?: string;
  txnLimit: number;
  txnDays?: number;
  dateFormat?: string;
  groupByDate: boolean;
  template: string;
  aligned: boolean;
  defaultCurrency?: string;
  stripStrings?: string;
  balanceAlign?: AmountWidth;
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

  // One shared column per padded field, so this submenu's rows line up.
  const txnColumns = !aligned
    ? undefined
    : measureColumns(
        template,
        txns.map((t) => ({
          txn: t,
          accountName: displayName,
          currency: account.currency,
          defaultCurrency,
          stripStrings,
          showAccount: false,
        })),
      );

  return (
    <MenuBarExtra.Submenu
      title={
        balanceAlign
          ? `${padAmount(label, balanceAlign)}   ${displayName}`
          : `${displayName}:  ${label}`
      }
      icon={accountIcon(balance, posColor, negColor)}
    >
      {available && Number(available) !== 0 && available !== account.balance ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`Available ${formatAmount(available, account.currency, defaultCurrency)}`}
            icon={Icon.Coins}
            onAction={async () => {
              const availFormatted = formatSignedAmount(
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

      {txns.length === 0 ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="No transactions in range"
            icon={Icon.Tray}
            onAction={() => undefined}
          />
        </MenuBarExtra.Section>
      ) : null}

      {/* Sections are emitted as a flat array; wrapping them in a fragment
          stops the menu bar renderer from picking up their titles. */}
      {txns.length
        ? renderTxnSections(displayedTxns, {
            groupByDate,
            dateFormat,
            currency: account.currency,
            defaultCurrency,
            stripStrings,
            template,
            columns: txnColumns,
            posColor,
            negColor,
          })
        : null}

      {moreTxns.length > 0 ? (
        <MenuBarExtra.Section key="more">
          <MenuBarExtra.Submenu title="More" icon={Icon.Ellipsis}>
            {renderTxnSections(moreTxns, {
              groupByDate,
              dateFormat,
              currency: account.currency,
              defaultCurrency,
              stripStrings,
              template,
              columns: txnColumns,
              posColor,
              negColor,
            })}
          </MenuBarExtra.Submenu>
        </MenuBarExtra.Section>
      ) : null}

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
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const accountSet = await getAccountSet(
      environment.launchType === LaunchType.Background,
    );
    const settings = await LocalStorage.allItems<Record<string, string>>();
    return { ...accountSet, settings };
  });

  const accounts = data?.accounts ?? [];
  const settings = data?.settings ?? {};

  const txnLimit = numberPref(prefs.prefAccountTxn, 8);
  // 0 hides the combined list, as the preference describes.
  const globalTxnCount = numberPref(prefs.prefGlobalTxnCount, 15);
  // 0 applies no day cutoff.
  const globalTxnDays = numberPref(prefs.prefGlobalTxnDays, 0);
  const titleMode = prefs.prefTitleMode || "total";
  // Left undefined when blank so day headings fall back to "ddd, MMM D".
  const dateFormat = prefs.prefDateFormat;
  const defaultCurrency = prefs.prefDefaultCurrency;
  const stripStrings = settings[STRIP_STORAGE_KEY];
  const template = prefs.prefRowTemplate?.trim() || DEFAULT_ROW_TEMPLATE;
  const aligned = !prefs.prefDisableAlignment;
  const groupByDate = !!prefs.prefGroupByDate;
  const { posColor, negColor } = getThemeColors(prefs);

  const visibleAccounts = accounts.filter(
    (a) => settings[`hide_${a.id}`] !== "true",
  );

  const orgEntries = sortAccountsAndOrgs(visibleAccounts, settings);

  // Balances share one column across every institution, not just within a section.
  const balanceAlign = maxAmountWidth(
    visibleAccounts.map((a) =>
      formatAmount(signedBalance(a, settings), a.currency, defaultCurrency),
    ),
  );

  // One total per currency: unlike currencies cannot be added together.
  const totals = totalsByCurrency(visibleAccounts, settings);
  // With several totals on show, stripping symbols would leave them ambiguous.
  const hideSymbol = totals.length > 1 ? undefined : defaultCurrency;
  // The menu bar is tight, and cents on a six-figure total are noise.
  const netTitle = totals
    .map((t) => formatSignedAmount(t.total, t.currency, hideSymbol, 0))
    .join("  ");

  const title = error
    ? "—"
    : titleMode === "none"
      ? undefined
      : totals.length
        ? netTitle
        : undefined;

  return (
    <MenuBarExtra
      icon={
        error
          ? { source: Icon.Warning, tintColor: Color.Red }
          : { source: Icon.Coins, tintColor: posColor }
      }
      title={title}
      isLoading={isLoading}
      tooltip="RayCash"
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
              groupByDate={groupByDate}
              defaultCurrency={defaultCurrency}
              stripStrings={stripStrings}
              template={template}
              aligned={aligned}
              balanceAlign={aligned ? balanceAlign : undefined}
              posColor={posColor}
              negColor={negColor}
            />
          ))}
        </MenuBarExtra.Section>
      ))}

      {totals.length > 0 && titleMode === "none" ? (
        <MenuBarExtra.Section>
          {totals.map(({ currency, total }) => {
            const label = formatSignedAmount(total, currency, hideSymbol);
            return (
              <MenuBarExtra.Item
                key={currency}
                title={`Net Total ${label}`}
                icon={{
                  source: Icon.Calculator,
                  tintColor: total < 0 ? negColor : posColor,
                }}
                onAction={async () => {
                  await Clipboard.copy(label);
                  await showHUD(`Copied ${label}`);
                }}
              />
            );
          })}
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

        if (allTxns.length === 0 || globalTxnCount === 0) return null;

        const limit = globalTxnCount;
        const displayedGlobalTxns = allTxns.slice(0, limit);
        const moreGlobalTxns = allTxns.slice(limit);

        const globalColumns = !aligned
          ? undefined
          : measureColumns(
              template,
              allTxns.map((t) => ({
                txn: t,
                accountName: t.accountName,
                currency: t.currency,
                defaultCurrency,
                stripStrings,
                showAccount: true,
              })),
            );

        const opts = {
          groupByDate,
          dateFormat,
          defaultCurrency,
          stripStrings,
          template,
          columns: globalColumns,
          withAccountName: true,
          posColor,
          negColor,
        };

        // Flat array, not a fragment — see renderTxnSections.
        return [
          ...renderTxnSections(displayedGlobalTxns, opts),
          moreGlobalTxns.length > 0 ? (
            <MenuBarExtra.Section key="global-more">
              <MenuBarExtra.Submenu title="More" icon={Icon.Ellipsis}>
                {renderTxnSections(moreGlobalTxns, opts)}
              </MenuBarExtra.Submenu>
            </MenuBarExtra.Section>
          ) : null,
        ];
      })()}

      {data?.fetchedAt ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`Last Refreshed: ${formatRefreshTime(data.fetchedAt, dateFormat)}`}
            icon={Icon.Clock}
            tooltip={`Last refresh: ${new Date(data.fetchedAt).toLocaleString()}\nClick to refresh`}
            onAction={async () => {
              try {
                await showHUD("Refreshing balances...");
                const res = await getAccountSet(true);
                revalidate();
                if (res.fromCache) {
                  await showHUD("Balances up to date (cached < 20m ago)");
                } else {
                  await showHUD("Balances refreshed successfully");
                }
              } catch (err) {
                await showHUD(`Failed to refresh: ${(err as Error).message}`);
              }
            }}
            alternate={
              <MenuBarExtra.Item
                title={`Copy Timestamp: ${formatRefreshTime(data.fetchedAt, dateFormat)}`}
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(
                    new Date(data.fetchedAt).toLocaleString(),
                  );
                  await showHUD("Copied refresh timestamp");
                }}
              />
            }
          />
        </MenuBarExtra.Section>
      ) : null}
    </MenuBarExtra>
  );
}
