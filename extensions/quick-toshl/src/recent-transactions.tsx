import { ActionPanel, Action, List, useNavigation, Icon, Color } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { toshl } from "./utils/toshl";
import { Transaction } from "./utils/types";
import { format, startOfMonth } from "date-fns";
import { formatCurrency } from "./utils/helpers";
import { isTransferEntry } from "./utils/toshl-model";
import { EntryEditDeleteSections } from "./components/EntryEditDeleteSections";

export default function RecentTransactions() {
  const { push, pop } = useNavigation();

  const today = new Date();
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const todayStr = format(today, "yyyy-MM-dd");

  const {
    data: transactions,
    isLoading,
    revalidate,
    mutate,
  } = usePromise(async (from: string, to: string) => toshl.getAllTransactions({ from, to }), [monthStart, todayStr]);
  const { data: categories } = useCachedPromise(() => toshl.getCategories());
  const { data: tags } = useCachedPromise(() => toshl.getTags());
  const { data: accounts } = useCachedPromise(() => toshl.getAccounts());
  const { data: defaultCurrency } = useCachedPromise(() => toshl.getDefaultCurrency());

  function getCategoryName(id: string) {
    return categories?.find((c) => c.id === id)?.name || "Unknown Category";
  }

  function getTagName(id: string) {
    return tags?.find((t) => t.id === id)?.name || "";
  }

  function getAccountName(id: string) {
    return accounts?.find((a) => a.id === id)?.name || "Unknown";
  }

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

  const summary = transactions?.reduce(
    (acc, t) => {
      if (isTransferEntry(t)) {
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
            const entryIsTransfer = isTransferEntry(transaction);
            const toAccountId = transaction.transaction?.account;

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
                    <EntryEditDeleteSections
                      transaction={transaction}
                      push={push}
                      pop={pop}
                      revalidate={revalidate}
                      onDeleted={async (t, mode) => {
                        await mutate(toshl.deleteTransaction(t.id, mode), {
                          optimisticUpdate: (data) => (data ?? []).filter((x) => x.id !== t.id),
                        });
                      }}
                    />
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
