import { ActionPanel, Action, List, useNavigation, Icon, Color, confirmAlert, Alert } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { toshl } from "./utils/toshl";
import { TransactionForm } from "./components/TransactionForm";
import { Transaction } from "./utils/types";
import { format, startOfMonth } from "date-fns";
import { formatCurrency } from "./utils/helpers";

export default function RecentTransactions() {
  const { push, pop } = useNavigation();

  // Fetch transactions for the current month
  const today = new Date();
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const todayStr = format(today, "yyyy-MM-dd");

  const {
    data: transactions,
    isLoading,
    revalidate,
    mutate,
  } = useCachedPromise(() => toshl.getTransactions({ from: monthStart, to: todayStr, per_page: 100 }));
  const { data: categories } = useCachedPromise(() => toshl.getCategories());
  const { data: tags } = useCachedPromise(() => toshl.getTags());
  const { data: accounts } = useCachedPromise(() => toshl.getAccounts());
  const { data: defaultCurrency } = useCachedPromise(() => toshl.getDefaultCurrency());

  async function handleDelete(transaction: Transaction, mode?: "one" | "tail" | "all") {
    const isRecurring = !!transaction.repeat;
    const message = isRecurring
      ? mode === "one"
        ? "Delete only this occurrence?"
        : mode === "tail"
          ? "Delete this and all future occurrences?"
          : "Delete ALL occurrences (past and future)?"
      : "Are you sure you want to delete this transaction?";

    if (
      await confirmAlert({
        title: "Delete Transaction",
        message,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await mutate(toshl.deleteTransaction(transaction.id, mode), {
        optimisticUpdate: (data) => data?.filter((t) => t.id !== transaction.id),
      });
    }
  }

  function getCategoryName(id: string) {
    return categories?.find((c) => c.id === id)?.name || "Unknown Category";
  }

  function getTagName(id: string) {
    return tags?.find((t) => t.id === id)?.name || "";
  }

  function getAccountName(id: string) {
    return accounts?.find((a) => a.id === id)?.name || "Unknown";
  }

  // Helper to detect transfers
  const isTransfer = (t: Transaction) => !!t.transaction?.account;

  // Group transactions by date
  const transactionsByDate = transactions?.reduce(
    (acc, t) => {
      const date = t.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(t);
      return acc;
    },
    {} as Record<string, Transaction[]>,
  );

  const sortedDates = Object.keys(transactionsByDate || {}).sort((a, b) => b.localeCompare(a));

  // Calculate summary
  const summary = transactions?.reduce(
    (acc, t) => {
      if (isTransfer(t)) {
        acc.transfers += Math.abs(t.amount);
        acc.transferCount++;
      } else if (t.amount < 0) {
        acc.expenses += Math.abs(t.amount);
        acc.expenseCount++;
      } else {
        acc.incomes += t.amount;
        acc.incomeCount++;
      }
      return acc;
    },
    { expenses: 0, incomes: 0, transfers: 0, expenseCount: 0, incomeCount: 0, transferCount: 0 },
  ) || { expenses: 0, incomes: 0, transfers: 0, expenseCount: 0, incomeCount: 0, transferCount: 0 };

  const balance = summary.incomes - summary.expenses;
  const monthName = format(today, "MMMM yyyy");

  return (
    <List isLoading={isLoading}>
      <List.Section title="Summary">
        <List.Item
          icon={Icon.BarChart}
          title={monthName}
          accessories={[
            { text: `${transactions?.length || 0} entries` },
            {
              text: `Expenses: ${formatCurrency(summary.expenses, defaultCurrency || "USD")}`,
              icon: Icon.ArrowDown,
            },
            { text: `Income: ${formatCurrency(summary.incomes, defaultCurrency || "USD")}`, icon: Icon.ArrowUp },
            {
              text: `Balance: ${balance >= 0 ? "+" : ""}${formatCurrency(balance, defaultCurrency || "USD")}`,
              icon: balance >= 0 ? Icon.CheckCircle : Icon.ExclamationMark,
            },
          ]}
        />
      </List.Section>
      {sortedDates.map((date) => (
        <List.Section key={date} title={format(new Date(date), "EEEE, MMM d, yyyy")}>
          {transactionsByDate![date].map((transaction) => {
            const entryIsTransfer = isTransfer(transaction);
            const toAccountId = transaction.transaction?.account;

            // Determine icon and subtitle based on type
            let icon;
            let subtitle;
            if (entryIsTransfer) {
              icon = { source: Icon.Switch, tintColor: Color.Blue };
              subtitle = `${getAccountName(transaction.account)} → ${toAccountId ? getAccountName(toAccountId) : "Unknown"}`;
            } else if (transaction.amount < 0) {
              icon = { source: Icon.ArrowDown, tintColor: Color.Red };
              subtitle = getCategoryName(transaction.category);
            } else {
              icon = { source: Icon.ArrowUp, tintColor: Color.Green };
              subtitle = getCategoryName(transaction.category);
            }

            return (
              <List.Item
                key={transaction.id}
                icon={icon}
                title={transaction.desc || (entryIsTransfer ? "Transfer" : "No Description")}
                subtitle={subtitle}
                accessories={[
                  ...(!entryIsTransfer && (transaction.tags || []).length > 0
                    ? [{ text: (transaction.tags || []).map(getTagName).join(", "), icon: Icon.Tag }]
                    : []),
                  ...(transaction.repeat
                    ? [
                        {
                          icon: Icon.ArrowClockwise,
                          tooltip: `Repeats ${transaction.repeat.frequency}${transaction.repeat.interval > 1 ? ` every ${transaction.repeat.interval}` : ""}`,
                        },
                      ]
                    : []),
                  {
                    text: formatCurrency(transaction.amount, transaction.currency.code),
                    tooltip: `Account: ${getAccountName(transaction.account)}`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Edit">
                      <Action
                        title="Edit This Entry"
                        icon={Icon.Pencil}
                        onAction={() =>
                          push(
                            <TransactionForm
                              type={transaction.amount < 0 ? "expense" : "income"}
                              transaction={transaction}
                              onSubmit={async (values) => {
                                await toshl.updateTransaction(
                                  transaction.id,
                                  values,
                                  transaction.repeat ? "one" : undefined,
                                );
                                revalidate();
                                pop();
                              }}
                            />,
                          )
                        }
                      />
                      {transaction.repeat && (
                        <>
                          <Action
                            title="Edit This & Future"
                            icon={Icon.Forward}
                            onAction={() =>
                              push(
                                <TransactionForm
                                  type={transaction.amount < 0 ? "expense" : "income"}
                                  transaction={transaction}
                                  onSubmit={async (values) => {
                                    await toshl.updateTransaction(transaction.id, values, "tail");
                                    revalidate();
                                    pop();
                                  }}
                                />,
                              )
                            }
                          />
                          <Action
                            title="Edit All Occurrences"
                            icon={Icon.List}
                            onAction={() =>
                              push(
                                <TransactionForm
                                  type={transaction.amount < 0 ? "expense" : "income"}
                                  transaction={transaction}
                                  onSubmit={async (values) => {
                                    await toshl.updateTransaction(transaction.id, values, "all");
                                    revalidate();
                                    pop();
                                  }}
                                />,
                              )
                            }
                          />
                        </>
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Delete">
                      <Action
                        title={transaction.repeat ? "Delete This Only" : "Delete Transaction"}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete(transaction, transaction.repeat ? "one" : undefined)}
                      />
                      {transaction.repeat && (
                        <>
                          <Action
                            title="Delete This & Future"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            onAction={() => handleDelete(transaction, "tail")}
                          />
                          <Action
                            title="Delete All Occurrences"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            onAction={() => handleDelete(transaction, "all")}
                          />
                        </>
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser title="Open in Toshl" url="https://toshl.com/app/#/expenses" />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
