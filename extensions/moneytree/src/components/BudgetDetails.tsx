import { Action, ActionPanel, environment, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { budgetChartMarkdown } from "../lib/budget-chart";
import { BudgetForm } from "./BudgetForm";
import { EditCategoryAction } from "./EditCategoryAction";
import { TransactionsList } from "./TransactionsList";
import {
  getAverageMonthlySpending,
  getAverageSpendingPeriodDates,
  getBudgetProgress,
  getSpendingPeriodDates,
  type BudgetWithCategory,
} from "../lib/budgets";
import { fetchTransactions } from "../lib/moneytree";
import { getMonthlySpending } from "../lib/api";
import type { Category } from "../lib/types";

const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });

export function BudgetDetails({
  budget,
  budgets,
  categories,
  onSaved,
}: {
  budget: BudgetWithCategory;
  budgets: BudgetWithCategory[];
  categories: Category[];
  onSaved: (categoryId: number) => void | Promise<void>;
}) {
  const { pop } = useNavigation();
  const today = new Date();
  const dates = getSpendingPeriodDates(today);
  const averageDates = getAverageSpendingPeriodDates(today);
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const transactionDates = { startDate: currentMonth, endDate: dates.endDate };
  const {
    data: periods,
    isLoading,
    revalidate,
  } = useCachedPromise(getMonthlySpending, [dates.startDate, dates.endDate]);
  const {
    data: averagePeriods,
    isLoading: averageLoading,
    revalidate: revalidateAverage,
  } = useCachedPromise(getMonthlySpending, [averageDates.startDate, averageDates.endDate]);
  const {
    data: transactionsResult,
    isLoading: transactionsLoading,
    error: transactionsError,
    revalidate: revalidateTransactions,
  } = useCachedPromise(fetchTransactions, [
    {
      ...transactionDates,
      maxPages: 10,
    },
  ]);
  const transactions =
    transactionsResult?.transactions.filter((transaction) => transaction.category_id === budget.category_id) ?? [];
  const progress = periods && getBudgetProgress(budget, periods, today);
  const previous =
    periods && getBudgetProgress(budget, periods, new Date(today.getFullYear(), today.getMonth() - 1, 1));
  const average = averagePeriods && getAverageMonthlySpending(budget, averagePeriods, today);
  const month = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(today);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const shortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
  const chart = budgetChartMarkdown({
    limit: budget.amount,
    spent: progress?.spent,
    average: average ?? undefined,
    lastMonth: previous?.spent,
    day: today.getDate(),
    daysInMonth,
    periodLabel: `${shortDate.format(new Date(today.getFullYear(), today.getMonth(), 1))} – ${shortDate.format(new Date(today.getFullYear(), today.getMonth(), daysInMonth))}, ${today.getFullYear()}`,
    appearance: environment.appearance,
  });
  const summary = [
    `## ${budget.category.name} · ${month}`,
    chart,
    averageLoading && average === undefined ? "_Loading 12-month average…_" : "",
    transactionsResult && transactionsResult.details.transactions_count > transactionsResult.transactions.length
      ? "⚠️ _Showing the first 10 pages of transactions only._"
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const actions = (
    <ActionPanel>
      <Action.Push
        title="This Month’s Transactions"
        icon={Icon.Receipt}
        target={
          <TransactionsList
            budgetCategory={{ id: budget.category_id, name: budget.category.name }}
            dateRange={transactionDates}
          />
        }
      />
      <Action.Push
        title="Edit Budget"
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={<BudgetForm categories={categories} budgets={budgets} editing={budget} onSaved={onSaved} fromDetails />}
      />
      <EditCategoryAction
        category={budget.category}
        categories={categories}
        onSaved={() => {
          // These details hold the old category, so return to the refreshed budget list, like BudgetForm does.
          void onSaved(budget.category_id);
          pop();
        }}
      />
      <Action
        title="Refresh Spending"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => {
          revalidate();
          revalidateAverage();
          revalidateTransactions();
        }}
      />
    </ActionPanel>
  );
  return (
    <List
      navigationTitle={`${budget.category.name} Budget`}
      searchBarPlaceholder="Search this month's transactions"
      isShowingDetail
      isLoading={isLoading || transactionsLoading}
    >
      {!transactions.length && !transactionsLoading ? (
        // Keep the budget summary visible even without transaction rows to attach it to.
        <List.Item
          id="summary"
          icon={transactionsError ? Icon.ExclamationMark : Icon.Receipt}
          title={transactionsError ? "Transactions Unavailable" : "No Transactions This Month"}
          detail={<List.Item.Detail markdown={summary} />}
          actions={actions}
        />
      ) : (
        <List.Section title={`${month} Transactions`} subtitle={`${transactions.length} shown`}>
          {transactions.map((transaction) => {
            const description = transaction.description_pretty || transaction.description_raw || "Unknown";
            return (
              <List.Item
                key={transaction.id}
                id={String(transaction.id)}
                title={transaction.date.substring(0, 10)}
                subtitle={{ value: description, tooltip: description }}
                keywords={[description, yen.format(transaction.amount)]}
                accessories={[{ text: yen.format(transaction.amount) }]}
                detail={<List.Item.Detail markdown={summary} />}
                actions={actions}
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
