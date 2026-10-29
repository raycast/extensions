import { Action, ActionPanel, Alert, Icon, Keyboard, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { getProgressIcon, useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";
import { BudgetForm } from "./components/BudgetForm";
import { TransactionsList } from "./components/TransactionsList";
import { BudgetDetails } from "./components/BudgetDetails";
import { EditCategoryAction } from "./components/EditCategoryAction";
import { budgetProgressColor } from "./lib/budget-chart";
import { getMonthlySpending } from "./lib/api";
import {
  changeBudget,
  describeBudgets,
  getBudgetContext,
  getBudgetProgress,
  getBudgetTotals,
  getSpendingPeriodDates,
  organizeBudgets,
  type BudgetFilter,
  BUDGET_SORT_LABELS,
  type BudgetSort,
} from "./lib/budgets";

const formatJPY = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });

export default function Command() {
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [filter, setFilter] = useState<BudgetFilter>("all");
  const [storedSort, setSort] = useCachedState<BudgetSort>("budget-sort", "percent");
  const sort: BudgetSort = storedSort in BUDGET_SORT_LABELS ? storedSort : "percent";
  const { data, isLoading, error, revalidate } = useCachedPromise(getBudgetContext, []);
  const budgets = data ? describeBudgets(data.budgets, data.categories) : [];
  const today = new Date();
  const { startDate, endDate } = getSpendingPeriodDates(today);
  const { data: spending, revalidate: revalidateSpending } = useCachedPromise(getMonthlySpending, [startDate, endDate]);
  const totals = data && getBudgetTotals(data.budgets, spending, today);
  const visibleBudgets = organizeBudgets(budgets, spending, today, filter, sort);
  const totalLabel = totals
    ? totals.spent === undefined
      ? `Total limit ${formatJPY.format(totals.limit)} · spending unavailable`
      : `Total ${formatJPY.format(totals.spent)} / ${formatJPY.format(totals.limit)} · ${totals.limit > 0 ? Math.round((totals.spent / totals.limit) * 100) : 0}%`
    : undefined;
  async function onSaved(categoryId: number) {
    await revalidate();
    setSelectedItemId(String(categoryId));
  }
  const createAction = data && (
    <Action.Push
      title="Create Budget"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<BudgetForm categories={data.categories} budgets={budgets} onSaved={onSaved} />}
    />
  );

  async function deleteBudget(categoryId: number, categoryName: string, amount: number) {
    const confirmed = await confirmAlert({
      title: `Delete ${categoryName} Budget?`,
      message: `Remove the saved ${formatJPY.format(amount)} limit from Moneytree?`,
      primaryAction: { title: "Delete Budget", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await changeBudget("delete", categoryId);
      await revalidate();
      await showToast({ style: Toast.Style.Success, title: `${categoryName} budget deleted` });
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not delete budget",
        message: cause instanceof Error ? cause.message : "Unknown error",
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search budgets · Sorted by ${BUDGET_SORT_LABELS[sort]}`}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Budgets" value={filter} onChange={(value) => setFilter(value as BudgetFilter)}>
          <List.Dropdown.Item title="All Budgets" value="all" />
          <List.Dropdown.Item title="Over Budget" value="over" />
          <List.Dropdown.Item title="Nearly Used (75–99%)" value="near" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Load Budgets"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Refresh Budgets"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => {
                  revalidate();
                  revalidateSpending();
                }}
              />
            </ActionPanel>
          }
        />
      ) : !isLoading && !budgets.length ? (
        <List.EmptyView
          icon={Icon.List}
          title="No Saved Budgets"
          description="No category budget limits were returned."
          actions={<ActionPanel>{createAction}</ActionPanel>}
        />
      ) : !isLoading && !visibleBudgets.length ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Matching Budgets"
          description="Choose another filter."
          actions={
            <ActionPanel>
              <Action title="Show All Budgets" icon={Icon.List} onAction={() => setFilter("all")} />
              {createAction}
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Budgets" subtitle={totalLabel}>
          {visibleBudgets.map((budget) => (
            <List.Item
              key={budget.category_id}
              id={String(budget.category_id)}
              title={budget.category.name}
              accessories={(() => {
                const progress = spending && data && getBudgetProgress(budget, spending, today);
                return progress
                  ? [
                      {
                        text: `${formatJPY.format(progress.spent)} / ${formatJPY.format(budget.amount)}`,
                        tooltip: "This month: spent / saved limit",
                      },
                      {
                        icon: getProgressIcon(
                          Math.min(1, progress.percent / 100),
                          budgetProgressColor(progress.percent / 100),
                        ),
                        text: {
                          value: `${Math.round(progress.percent)}%`,
                          color: budgetProgressColor(progress.percent / 100),
                        },
                        tooltip: "Share of this month's budget used",
                      },
                    ]
                  : [{ text: formatJPY.format(budget.amount), tooltip: "Saved limit; spending unavailable" }];
              })()}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Budget Details"
                    icon={Icon.Coins}
                    target={
                      <BudgetDetails
                        budget={budget}
                        budgets={budgets}
                        categories={data?.categories ?? []}
                        onSaved={onSaved}
                      />
                    }
                  />
                  <Action.Push
                    title="Edit Budget"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <BudgetForm
                        categories={data?.categories ?? []}
                        budgets={budgets}
                        editing={budget}
                        onSaved={onSaved}
                      />
                    }
                  />
                  <EditCategoryAction
                    category={budget.category}
                    categories={data?.categories ?? []}
                    onSaved={() => onSaved(budget.category_id)}
                  />
                  <Action.Push
                    title="Show Transactions"
                    icon={Icon.Receipt}
                    target={
                      <TransactionsList budgetCategory={{ id: budget.category_id, name: budget.category.name }} />
                    }
                  />
                  {createAction}
                  <ActionPanel.Submenu title="Sort Budgets" icon={Icon.ChevronUpDown}>
                    {(Object.keys(BUDGET_SORT_LABELS) as BudgetSort[]).map((option) => (
                      <Action
                        key={option}
                        title={BUDGET_SORT_LABELS[option]}
                        icon={option === sort ? Icon.Checkmark : undefined}
                        onAction={() => setSort(option)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                  <Action
                    title="Delete Budget"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => deleteBudget(budget.category_id, budget.category.name, budget.amount)}
                  />
                  <Action
                    title="Refresh Budgets"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => {
                      revalidate();
                      revalidateSpending();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
