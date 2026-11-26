import { useState } from "react";
import { Action, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { type Budget, getBudget, listExpensesByAllocation } from "./cushn";
import { ExpenseItem, Expenses } from "./expenses";
import { leftText } from "./format";
import { LoadErrorView, RefreshAction } from "./views";

const ALL = "all";

export function BudgetExpenses({ budget, allocationId }: { budget: Budget; allocationId?: string }) {
  const [filter, setFilter] = useState(allocationId ?? ALL);
  const details = usePromise(getBudget, [budget.id], {
    failureToastOptions: { title: "Couldn't load the budget" },
  });
  const expenses = usePromise(listExpensesByAllocation, [budget.id], {
    failureToastOptions: { title: "Couldn't load expenses" },
  });

  function revalidate() {
    details.revalidate();
    expenses.revalidate();
  }

  const error = details.error ?? expenses.error;
  const allocations = details.data?.allocations.filter((allocation) => allocation.editable) ?? [];
  const active = details.data?.budget.status === "active";

  return (
    <List
      isLoading={details.isLoading || expenses.isLoading}
      navigationTitle={budget.title}
      searchBarPlaceholder="Search expenses"
      searchBarAccessory={
        <List.Dropdown tooltip="Allocation" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All Allocations" value={ALL} />
          <List.Dropdown.Section>
            {allocations.map((allocation) => (
              <List.Dropdown.Item key={allocation.id} title={allocation.categoryName} value={allocation.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error && !(details.data && expenses.data) ? (
        <LoadErrorView title="Couldn't load expenses" error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.Coins} title="No expenses" />
      )}
      {allocations
        .filter((allocation) => filter === ALL || allocation.id === filter)
        .map((allocation) => (
          <List.Section
            key={allocation.id}
            title={allocation.categoryName}
            subtitle={leftText(allocation.amount - allocation.spent, allocation.amount, budget.currency)}
          >
            {expenses.data?.[allocation.id]?.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                currency={budget.currency}
                actions={
                  <>
                    {active && (
                      <Action.Push
                        title={`Add to ${allocation.categoryName}`}
                        icon={Icon.Plus}
                        target={<Expenses budget={budget} allocation={allocation} />}
                        onPop={revalidate}
                      />
                    )}
                    <RefreshAction onAction={revalidate} />
                  </>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
