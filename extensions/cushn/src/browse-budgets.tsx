import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Allocations } from "./allocations";
import { BudgetExpenses } from "./budget-expenses";
import {
  type Budget,
  type BudgetDetails,
  type BudgetStatus,
  type OverspentAllocation,
  disconnect,
  getBudget,
  hasLauncher,
  listBudgets,
  listOverspent,
} from "./cushn";
import { formatMoney, leftText } from "./format";
import { OpenCushnAction } from "./open-cushn-action";
import { LoadErrorView, NotConnectedView, RefreshAction } from "./views";

const OVERSPENT_PREFIX = "overspent:";

export default function Command() {
  const launcher = hasLauncher();
  const [status, setStatus] = useState<BudgetStatus>("active");
  const [selectedId, setSelectedId] = useState<string>();

  const budgets = useCachedPromise(listBudgets, [status], {
    execute: launcher,
    failureToastOptions: { title: "Couldn't load budgets" },
  });
  const overspent = useCachedPromise(listOverspent, [], {
    execute: launcher && status === "active",
    onError: () => undefined,
  });
  const details = useCachedPromise(getBudget, [selectedId ?? ""], {
    execute: launcher && selectedId !== undefined,
    onError: () => undefined,
  });

  useEffect(() => disconnect, []);

  if (!launcher) return <NotConnectedView />;

  function revalidate() {
    budgets.revalidate();
    overspent.revalidate();
    details.revalidate();
  }

  const overspentBudgetIds = new Set(overspent.data?.map((allocation) => allocation.budgetId));
  const shownOverspent = status === "active" ? (overspent.data ?? []) : [];

  return (
    <List
      isLoading={budgets.isLoading}
      isShowingDetail={Boolean(budgets.data?.length)}
      searchBarPlaceholder="Search budgets"
      onSelectionChange={(id) => setSelectedId(id && !id.startsWith(OVERSPENT_PREFIX) ? id : undefined)}
      searchBarAccessory={
        <List.Dropdown tooltip="Budgets" storeValue onChange={(value) => setStatus(value as BudgetStatus)}>
          <List.Dropdown.Item title="Active" value="active" />
          <List.Dropdown.Item title="Archived" value="archived" />
        </List.Dropdown>
      }
    >
      {budgets.error && !budgets.data ? (
        <LoadErrorView title="Couldn't load budgets" error={budgets.error} onRetry={budgets.revalidate} />
      ) : !budgets.data ? (
        <List.EmptyView icon={Icon.Wallet} title="Connecting to Cushn…" />
      ) : (
        <List.EmptyView
          icon={Icon.Wallet}
          title={status === "active" ? "No active budgets" : "No archived budgets"}
          actions={
            <ActionPanel>
              <OpenCushnAction />
            </ActionPanel>
          }
        />
      )}
      <List.Section title="Overspent">
        {shownOverspent.map((allocation) => (
          <OverspentItem
            key={allocation.id}
            allocation={allocation}
            budget={budgets.data?.find((budget) => budget.id === allocation.budgetId)}
            onRefresh={revalidate}
          />
        ))}
      </List.Section>
      <List.Section title={status === "active" ? "Budgets" : "Archived Budgets"}>
        {budgets.data?.map((budget) => (
          <List.Item
            key={budget.id}
            id={budget.id}
            title={budget.title}
            accessories={
              overspentBudgetIds.has(budget.id) && status === "active"
                ? [{ icon: { source: Icon.ExclamationMark, tintColor: Color.Red }, tooltip: "Overspent" }]
                : []
            }
            detail={
              <BudgetDetail
                budget={budget}
                details={details.data?.budget.id === budget.id ? details.data : undefined}
                isLoading={details.isLoading}
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Expenses"
                  icon={Icon.List}
                  target={<BudgetExpenses budget={budget} />}
                  onPop={revalidate}
                />
                {status === "active" && (
                  <Action.Push
                    title="Log Expense"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    target={<Allocations budget={budget} />}
                    onPop={revalidate}
                  />
                )}
                <OpenCushnAction />
                <RefreshAction onAction={revalidate} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function BudgetDetail(props: { budget: Budget; details: BudgetDetails | undefined; isLoading: boolean }) {
  const { budget, details } = props;
  const money = (amount: number) => formatMoney(amount, budget.currency);
  const left = budget.income - budget.spent;
  const used = budget.income > 0 ? ` · ${Math.round((budget.spent / budget.income) * 100)}%` : "";

  return (
    <List.Item.Detail
      isLoading={props.isLoading && !details}
      markdown={details?.budget.description || undefined}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Income" text={money(budget.income)} />
          <List.Item.Detail.Metadata.Label title="Spent" text={`${money(budget.spent)}${used}`} />
          <List.Item.Detail.Metadata.Label
            title={left < 0 ? "Overspent" : "Left"}
            text={{ value: money(Math.abs(left)), color: left < 0 ? Color.Red : Color.PrimaryText }}
          />
          {details && <List.Item.Detail.Metadata.Separator />}
          {details?.allocations.map((allocation) => {
            const allocationLeft = allocation.amount - allocation.spent;
            return (
              <List.Item.Detail.Metadata.Label
                key={allocation.id}
                title={allocation.categoryName}
                text={
                  allocation.editable
                    ? {
                        value: leftText(allocationLeft, allocation.amount, budget.currency),
                        color: allocationLeft < 0 ? Color.Red : Color.PrimaryText,
                      }
                    : money(allocation.amount)
                }
              />
            );
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function OverspentItem(props: { allocation: OverspentAllocation; budget: Budget | undefined; onRefresh: () => void }) {
  const { allocation, budget } = props;
  const money = (amount: number) => formatMoney(amount, allocation.currency);
  return (
    <List.Item
      id={`${OVERSPENT_PREFIX}${allocation.id}`}
      icon={{ source: Icon.Warning, tintColor: Color.Red }}
      title={allocation.categoryName}
      subtitle={allocation.budgetTitle}
      keywords={[allocation.budgetTitle]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Budget" text={allocation.budgetTitle} />
              <List.Item.Detail.Metadata.Label title="Allocated" text={money(allocation.amount)} />
              <List.Item.Detail.Metadata.Label title="Spent" text={money(allocation.spent)} />
              <List.Item.Detail.Metadata.Label
                title="Overspent"
                text={{ value: money(allocation.spent - allocation.amount), color: Color.Red }}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {budget && (
            <Action.Push
              title="Show Expenses"
              icon={Icon.List}
              target={<BudgetExpenses budget={budget} allocationId={allocation.id} />}
              onPop={props.onRefresh}
            />
          )}
          <OpenCushnAction />
          <RefreshAction onAction={props.onRefresh} />
        </ActionPanel>
      }
    />
  );
}
