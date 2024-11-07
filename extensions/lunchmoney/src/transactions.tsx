import { ActionPanel, List, Action, Icon, Color, Image, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { match, P } from "ts-pattern";
import * as lunchMoney from "./lunchmoney";
import { useMemo, useState } from "react";
import { eachMonthOfInterval, endOfMonth, format, startOfYear } from "date-fns";
import { alphabetical, group, sift, sort } from "radash";

const getTransactionIcon = (transaction: lunchMoney.Transaction) =>
  match(transaction)
    .returnType<Image>()
    .with({ status: lunchMoney.TransactionStatus.CLEARED, recurring_type: P.nullish }, () => ({
      source: Icon.CheckCircle,
      tintColor: Color.Green,
    }))
    .with(
      { status: lunchMoney.TransactionStatus.CLEARED, recurring_type: lunchMoney.ReccuringTransactionType.CLEARED },
      () => ({
        source: Icon.RotateClockwise,
        tintColor: Color.Blue,
      }),
    )
    .with({ status: lunchMoney.TransactionStatus.UNCLEARED }, () => ({
      source: Icon.CircleProgress50,
      tintColor: Color.Yellow,
    }))
    .with({ status: lunchMoney.TransactionStatus.PENDING }, () => ({
      source: Icon.Stopwatch,
    }))
    .otherwise(() => ({ source: Icon.Circle }));

const getTransactionSubtitle = (transaction: lunchMoney.Transaction) =>
  match(transaction)
    .returnType<string>()
    .with(
      { recurring_payee: P.string.select(), recurring_type: lunchMoney.ReccuringTransactionType.CLEARED },
      (payee) => payee,
    )
    .otherwise(() => transaction.payee);

function TransactionListItem({
  transaction,
  onValidate,
}: {
  transaction: lunchMoney.Transaction;
  onValidate: (transaction: lunchMoney.Transaction) => void;
}) {
  const validate = async () => {
    onValidate(transaction);
  };

  return (
    <List.Item
      title={`${Intl.NumberFormat("en-US", { style: "currency", currency: transaction.currency }).format(transaction.to_base)}`}
      subtitle={getTransactionSubtitle(transaction)}
      icon={getTransactionIcon(transaction)}
      accessories={sift([
        { text: `${transaction.plaid_account_name ?? transaction.asset_name ?? ""}` },
        { text: format(transaction.date, "PP"), tooltip: transaction.date },
        transaction.is_group ? { icon: Icon.Folder, tooltip: "Group" } : undefined,
        ...(transaction.tags?.map((tag) => ({ tag: tag.name })) ?? []),
      ])}
      keywords={sift([transaction.payee, transaction.recurring_payee, transaction.notes, transaction.display_note])}
      actions={
        <ActionPanel>
          {transaction.status != lunchMoney.TransactionStatus.CLEARED && !transaction.is_pending && (
            <Action title="Validate" icon={Icon.CheckCircle} onAction={validate} />
          )}
          <Action.OpenInBrowser
            title="View Payee in Lunch Money"
            url={`https://my.lunchmoney.app/transactions/${format(transaction.date, "yyyy/MM")}?match=all&payee_exact=${encodeURIComponent(transaction.payee)}&time=month`}
          />
        </ActionPanel>
      }
    />
  );
}

const groupAndSortTransactions = (transactions: lunchMoney.Transaction[]) => {
  const transactionsByDay = group(transactions, (t) => t.date);

  const sortedTransactions: lunchMoney.Transaction[] = [];
  const days = alphabetical(Object.keys(transactionsByDay), (k) => k, "desc");

  for (const day of days) {
    const transactions = transactionsByDay[day];
    if (transactions != null) {
      sortedTransactions.push(...sort(transactions, (t) => t.to_base, true));
    }
  }
  return sortedTransactions;
};

function TransactionsDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const months = eachMonthOfInterval({
    start: startOfYear(new Date()),
    end: new Date(),
  }).reverse();

  return (
    <List.Dropdown tooltip="Choose a month" value={value} onChange={onChange}>
      <List.Dropdown.Section title="Month">
        {months.map((month) => (
          <List.Dropdown.Item
            key={format(month, "yyyy-MM")}
            title={format(month, "MMM yyyy")}
            value={format(month, "yyyy-MM-dd")}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function Command() {
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const { data, isLoading, mutate } = useCachedPromise(lunchMoney.getTransactions, [
    { start_date: month, end_date: format(endOfMonth(month), "yyyy-MM-dd") },
  ]);

  const [pendingTransactions, transactions] = useMemo(() => {
    const [pendingTransactions, transactions] = (data ?? []).reduce(
      function groupTransactions(acc, transaction) {
        if (transaction.status === lunchMoney.TransactionStatus.PENDING || transaction.is_pending) {
          acc[0].push(transaction);
        } else if (transaction.group_id == null) {
          acc[1].push(transaction);
        }
        return acc;
      },
      [[], []] as [lunchMoney.Transaction[], lunchMoney.Transaction[]],
    );

    return [groupAndSortTransactions(pendingTransactions), alphabetical(transactions, (t) => t.date, "desc")];
  }, [data?.map((t) => `${t.id}:${t.status}`).join(",")]);

  const onValidate = async (transaction: lunchMoney.Transaction) => {
    const toast = await showToast({
      title: "Validating",
      style: Toast.Style.Animated,
    });

    try {
      await mutate(
        lunchMoney.updateTransaction(transaction.id, {
          status: lunchMoney.TransactionStatus.CLEARED,
        }),
        {
          optimisticUpdate: (data) => {
            if (data == null) return data;
            return data.map((t) => {
              if (t.id === transaction.id) {
                t.status = lunchMoney.TransactionStatus.CLEARED;
              }
              return t;
            });
          },
        },
      );

      toast.style = Toast.Style.Success;
      toast.title = "Validated";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to validate";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  };

  return (
    <List isLoading={isLoading} searchBarAccessory={<TransactionsDropdown value={month} onChange={setMonth} />}>
      <List.Section title="Pending Transactions">
        {pendingTransactions.map((transaction) => (
          <TransactionListItem key={String(transaction.id)} transaction={transaction} onValidate={onValidate} />
        ))}
      </List.Section>
      <List.Section title="Transactions">
        {transactions.map((transaction) => (
          <TransactionListItem key={String(transaction.id)} transaction={transaction} onValidate={onValidate} />
        ))}
      </List.Section>
    </List>
  );
}
