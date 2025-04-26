import { ActionPanel, List, Action, Icon, Color, Image, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { match, P } from "ts-pattern";
import * as lunchMoney from "./lunchmoney";
import { EditTransactionForm } from "./transactions_form";
import { useMemo, useState } from "react";
import { compareDesc, eachMonthOfInterval, endOfMonth, format, parse, startOfMonth, startOfYear } from "date-fns";
import { alphabetical, group, sift, sort } from "radash";
import { getFormatedAmount } from "./format";

export const getTransactionIcon = (transaction: lunchMoney.Transaction) =>
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

export const getTransactionSubtitle = (transaction: lunchMoney.Transaction) =>
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
  onEdit,
}: {
  transaction: lunchMoney.Transaction;
  onValidate: (transaction: lunchMoney.Transaction) => void;
  onEdit: (transaction: lunchMoney.Transaction, update: lunchMoney.TransactionUpdate) => void;
}) {
  const validate = async () => {
    onValidate(transaction);
  };

  return (
    <List.Item
      title={getFormatedAmount(transaction)}
      subtitle={getTransactionSubtitle(transaction)}
      icon={getTransactionIcon(transaction)}
      accessories={sift([
        { text: transaction.account_display_name },
        transaction.is_group ? { icon: Icon.Folder, tooltip: "Group" } : undefined,
        ...(transaction.tags?.map((tag) => ({ tag: tag.name })) ?? []),
        transaction.category_name ? { tag: transaction.category_name, icon: Icon.Tag } : undefined,
      ])}
      keywords={sift([
        transaction.status,
        transaction.payee,
        transaction.recurring_payee,
        transaction.notes,
        transaction.display_note,
      ])}
      actions={
        <ActionPanel>
          {transaction.status != lunchMoney.TransactionStatus.CLEARED && !transaction.is_pending && (
            <Action title="Validate" icon={Icon.CheckCircle} onAction={validate} />
          )}
          <Action.Push
            title="Edit Transaction"
            shortcut={{ modifiers: [], key: "arrowRight" }}
            icon={Icon.Pencil}
            target={<EditTransactionForm transaction={transaction} onEdit={onEdit} />}
          />
          <Action.OpenInBrowser
            title="View Payee in Lunch Money"
            url={`https://my.lunchmoney.app/transactions/${format(transaction.date, "yyyy/MM")}?match=all&payee_exact=${encodeURIComponent(transaction.payee)}&time=month`}
          />
        </ActionPanel>
      }
    />
  );
}

/// Sorts transactions by date, then by to_base
const groupAndSortTransactionsByBase = (transactions: lunchMoney.Transaction[]) => {
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

/// Sorts transactions by date, then by created_at
const groupAndSortTransactionsByCreatedAt = (
  transactions: lunchMoney.Transaction[],
): Record<string, lunchMoney.Transaction[]> => {
  const transactionsByDay = group(transactions, (t) => t.date);

  const sortedTransactions: Record<string, lunchMoney.Transaction[]> = {};
  const days = alphabetical(Object.keys(transactionsByDay), (k) => k, "desc");

  for (const day of days) {
    const transactions = transactionsByDay[day];
    if (transactions != null) {
      sortedTransactions[day] = transactions.toSorted((a, b) => compareDesc(a.created_at, b.created_at));
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
  const [month, setMonth] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const { data, isLoading, mutate } = useCachedPromise(lunchMoney.getTransactions, [
    { start_date: month, end_date: format(endOfMonth(parse(month, "yyyy-MM-dd", new Date())), "yyyy-MM-dd") },
  ]);

  const [pendingTransactions, transactionsGroups] = useMemo(() => {
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

    return [groupAndSortTransactionsByBase(pendingTransactions), groupAndSortTransactionsByCreatedAt(transactions)];
  }, [data]);

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

  const onEdit = async (transaction: lunchMoney.Transaction, update: lunchMoney.TransactionUpdate) => {
    const toast = await showToast({
      title: "Updating Transaction",
      style: Toast.Style.Animated,
    });

    try {
      await mutate(lunchMoney.updateTransaction(transaction.id, update), {
        optimisticUpdate: (currentData) => {
          if (!currentData) return currentData;
          return currentData.map((tx) => {
            if (tx.id === transaction.id) {
              tx.payee = update.payee ? update.payee : transaction.payee;
              tx.status = update.status ? update.status : transaction.status;
              tx.notes = update.notes ? update.notes : transaction.notes;
              tx.category_id = update.category_id ? update.category_id : transaction.category_id;
              tx.date = update.date ? update.date : transaction.date;
            }
            return tx;
          });
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = "Transaction updated";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update transaction";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    }
  };

  return (
    <List isLoading={isLoading} searchBarAccessory={<TransactionsDropdown value={month} onChange={setMonth} />}>
      <List.Section title="Pending Transactions">
        {pendingTransactions.map((transaction) => (
          <TransactionListItem
            key={String(transaction.id)}
            transaction={transaction}
            onValidate={onValidate}
            onEdit={onEdit}
          />
        ))}
      </List.Section>
      {Object.entries(transactionsGroups).map(([month, transactions]) => (
        <List.Section key={month} title={format(new Date(month), "PP")}>
          {transactions.map((transaction) => (
            <TransactionListItem
              key={String(transaction.id)}
              transaction={transaction}
              onValidate={onValidate}
              onEdit={onEdit}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
