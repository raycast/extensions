import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { formatCurrency } from "../format";
import { MercuryLogin } from "../logins";
import { log, TreasuryAccount } from "../mercury";
import { describe, getTreasuryTransactions, securityNames, TreasuryTransaction } from "../treasury";
import { LoginErrorView } from "./ErrorViews";
import { groupByDay } from "./TransactionList";

/**
 * Every Treasury entry. Daily valuation changes (mark-to-market) outnumber everything else, so
 * they're hidden unless asked for, the same way Mercury's dashboard hides them from Activity.
 */
export function TreasuryTransactionList({ login, account }: { login: MercuryLogin; account: TreasuryAccount }) {
  const [filter, setFilter] = useCachedState("treasury-activity-filter", "activity");
  const { data, isLoading, error, revalidate } = usePromise(
    (_loginId: string, id: string) => getTreasuryTransactions(login, id),
    [login.id, account.id],
    { onError: (failure) => log.error("Couldn't load treasury transactions", { reason: failure.message }) },
  );
  const names = securityNames(account);
  const rows = (data ?? [])
    .map((transaction) => ({ transaction, row: describe(transaction, names) }))
    .filter(({ row }) => filter === "all" || !row.isValuation);

  const days = groupByDay(rows, (item) => `${item.transaction.canonicalDay.slice(0, 10)}T12:00:00`);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Treasury Activity · ${login.name}`}
      searchBarPlaceholder="Search treasury activity…"
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="Activity" value="activity" />
          <List.Dropdown.Item title="Including Valuation Changes" value="all" />
        </List.Dropdown>
      }
    >
      {!isLoading && rows.length === 0 && error && (
        <LoginErrorView login={login} error={error} onRetry={revalidate} onUpdated={revalidate} />
      )}
      {!isLoading && rows.length === 0 && !error && (
        <List.EmptyView icon={Icon.LineChart} title="No treasury activity yet" />
      )}
      {days.map((day) => (
        <List.Section key={day.title} title={day.title}>
          {day.items.map(({ transaction, row }) => (
            <TreasuryRow key={transaction.id} transaction={transaction} row={row} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function TreasuryRow({ transaction, row }: { transaction: TreasuryTransaction; row: ReturnType<typeof describe> }) {
  const amount = `${transaction.amount < 0 ? "−" : ""}${formatCurrency(Math.abs(transaction.amount))}`;
  return (
    <List.Item
      icon={row.icon}
      title={row.title}
      subtitle={row.subtitle}
      keywords={[transaction.description, transaction.type]}
      accessories={[
        row.amountColor
          ? { text: { value: amount, color: row.amountColor } }
          : { text: amount, tooltip: "A trade inside Treasury" },
        { text: formatCurrency(transaction.balance), tooltip: "Balance after this entry" },
      ]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Amount" content={amount} />
          <Action.CopyToClipboard title="Copy Description" content={transaction.description} />
        </ActionPanel>
      }
    />
  );
}
