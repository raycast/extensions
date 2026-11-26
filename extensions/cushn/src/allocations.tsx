import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { type Budget, listAllocations } from "./cushn";
import { Expenses } from "./expenses";
import { leftAccessories } from "./format";
import { LoadErrorView } from "./views";

export function Allocations({ budget }: { budget: Budget }) {
  const { data, isLoading, error, revalidate } = usePromise(listAllocations, [budget.id], {
    failureToastOptions: { title: "Couldn't load allocations" },
  });

  return (
    <List isLoading={isLoading} navigationTitle={budget.title} searchBarPlaceholder="Search allocations">
      {error && !data ? (
        <LoadErrorView title="Couldn't load allocations" error={error} onRetry={revalidate} />
      ) : data?.length === 0 ? (
        <List.EmptyView icon={Icon.List} title="No allocations take expenses in this budget" />
      ) : null}
      {data?.map((allocation) => (
        <List.Item
          key={allocation.id}
          title={allocation.categoryName}
          accessories={leftAccessories(allocation.amount - allocation.spent, allocation.amount, budget.currency)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Expenses"
                icon={Icon.Plus}
                target={<Expenses budget={budget} allocation={allocation} />}
                onPop={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
