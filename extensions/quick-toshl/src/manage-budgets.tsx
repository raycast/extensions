import {
  ActionPanel,
  Action,
  Form,
  List,
  Icon,
  useNavigation,
  showToast,
  Toast,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { format, addDays, subDays, startOfMonth } from "date-fns";
import { toshl } from "./utils/toshl";
import type { Budget } from "./utils/types";
import { formatCurrency } from "./utils/helpers";

function AddBudgetForm({ onSaved }: { onSaved: () => void }) {
  const { pop } = useNavigation();
  const { data: defaultCurrency } = useCachedPromise(() => toshl.getDefaultCurrency());
  const today = new Date();

  return (
    <Form
      navigationTitle="New budget"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            icon={Icon.Plus}
            onSubmit={async (v: { name: string; limit: string; rollover: boolean }) => {
              if (!v.name?.trim()) {
                showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              const limit = parseFloat(v.limit);
              if (isNaN(limit) || limit <= 0) {
                showToast({ style: Toast.Style.Failure, title: "Valid limit required" });
                return;
              }
              const code = defaultCurrency || "USD";
              await toshl.createBudget({
                name: v.name.trim(),
                limit,
                type: "regular",
                currency: { code },
                rollover: v.rollover,
                recurrence: {
                  frequency: "monthly",
                  interval: 1,
                  start: format(startOfMonth(today), "yyyy-MM-dd"),
                },
              });
              showToast({ style: Toast.Style.Success, title: "Budget created" });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="e.g. Groceries" />
      <Form.TextField id="limit" title="Limit" placeholder="500" />
      <Form.Checkbox id="rollover" label="Rollover unused amount" defaultValue={false} />
    </Form>
  );
}

function EditBudgetForm({ budget, onSaved }: { budget: Budget; onSaved: () => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Edit budget"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async (v: { name: string; limit: string; rollover: boolean }) => {
              if (!v.name?.trim()) {
                showToast({ style: Toast.Style.Failure, title: "Name required" });
                return;
              }
              const limit = parseFloat(v.limit);
              if (isNaN(limit) || limit <= 0) {
                showToast({ style: Toast.Style.Failure, title: "Valid limit required" });
                return;
              }
              await toshl.updateBudget(
                {
                  id: budget.id,
                  name: v.name.trim(),
                  limit,
                  type: budget.type,
                  currency: budget.currency,
                  modified: budget.modified,
                  rollover: v.rollover,
                  categories: budget.categories,
                  tags: budget.tags,
                  accounts: budget.accounts,
                  ...(budget.type === "percent" && budget.percent != null ? { percent: budget.percent } : {}),
                  ...(budget.type === "delta" && budget.delta != null ? { delta: budget.delta } : {}),
                },
                "one",
              );
              showToast({ style: Toast.Style.Success, title: "Budget updated" });
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Type: ${budget.type} · Period ${budget.from} → ${budget.to}. Changing limit applies to this iteration (update=one).`}
      />
      <Form.TextField id="name" title="Name" defaultValue={budget.name} />
      <Form.TextField id="limit" title="Limit" defaultValue={String(budget.limit)} />
      <Form.Checkbox id="rollover" label="Rollover" defaultValue={budget.rollover} />
    </Form>
  );
}

export default function ManageBudgets() {
  const { push } = useNavigation();
  const today = new Date();
  const from = format(subDays(today, 30), "yyyy-MM-dd");
  const to = format(addDays(today, 120), "yyyy-MM-dd");

  const { data: budgets, isLoading, revalidate } = usePromise(() => toshl.getBudgets({ from, to }));

  async function remove(b: Budget) {
    if (
      await confirmAlert({
        title: "Delete budget",
        message: `Delete “${b.name}”?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await toshl.deleteBudget(b.id);
      showToast({ style: Toast.Style.Success, title: "Budget deleted" });
      revalidate();
    }
  }

  return (
    <List
      navigationTitle="Budgets"
      isLoading={isLoading}
      searchBarPlaceholder="Filter budgets…"
      actions={
        <ActionPanel>
          <Action title="Add Budget" icon={Icon.Plus} onAction={() => push(<AddBudgetForm onSaved={revalidate} />)} />
        </ActionPanel>
      }
    >
      <List.Section title="Budgets">
        {budgets
          ?.filter((b) => b.status === "active")
          .sort((a, b) => a.order - b.order)
          .map((b) => (
            <List.Item
              key={b.id}
              title={b.name}
              subtitle={`${b.from} → ${b.to}`}
              accessories={[
                {
                  text: `${formatCurrency(b.amount, b.currency.code)} / ${formatCurrency(b.limit, b.currency.code)}`,
                },
              ]}
              icon={Icon.Coins}
              actions={
                <ActionPanel>
                  <Action
                    title="Edit"
                    icon={Icon.Pencil}
                    onAction={() => push(<EditBudgetForm budget={b} onSaved={revalidate} />)}
                  />
                  <Action
                    title="Add Budget"
                    icon={Icon.Plus}
                    onAction={() => push(<AddBudgetForm onSaved={revalidate} />)}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => remove(b)}
                  />
                  <Action.OpenInBrowser title="Open in Toshl" url={`https://toshl.com/app/#/budgets/${b.id}`} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
