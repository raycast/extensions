import { useEffect } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Allocations } from "./allocations";
import { disconnect, hasLauncher, listBudgets } from "./cushn";
import { leftAccessories } from "./format";
import { OpenCushnAction } from "./open-cushn-action";
import { LoadErrorView, NotConnectedView } from "./views";

export default function Command() {
  const launcher = hasLauncher();
  const { data, isLoading, error, revalidate } = useCachedPromise(listBudgets, [], {
    execute: launcher,
    failureToastOptions: { title: "Couldn't load budgets" },
  });

  useEffect(() => disconnect, []);

  if (!launcher) return <NotConnectedView />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search budgets">
      {error && !data ? (
        <LoadErrorView title="Couldn't load budgets" error={error} onRetry={revalidate} />
      ) : !data ? (
        <List.EmptyView icon={Icon.Wallet} title="Connecting to Cushn…" />
      ) : data.length === 0 ? (
        <List.EmptyView
          icon={Icon.Wallet}
          title="No active budgets"
          description="Create a budget in Cushn, then log expenses here."
          actions={
            <ActionPanel>
              <OpenCushnAction />
            </ActionPanel>
          }
        />
      ) : null}
      {data?.map((budget) => (
        <List.Item
          key={budget.id}
          title={budget.title}
          accessories={leftAccessories(budget.income - budget.spent, budget.income, budget.currency)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose Allocation"
                icon={Icon.ArrowRight}
                target={<Allocations budget={budget} />}
                onPop={revalidate}
              />
              <OpenCushnAction />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
