import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  WalletBudget,
  createBudget,
  getBudgets,
  getCategories,
} from "./lib/api";
import { formatMoney, parseMoney } from "./lib/format";

const BUDGET_TYPES = [
  { value: "BUDGET_INTERVAL_WEEK", title: "Weekly" },
  { value: "BUDGET_INTERVAL_MONTH", title: "Monthly" },
  { value: "BUDGET_INTERVAL_YEAR", title: "Yearly" },
];

function budgetTypeTitle(type?: string): string {
  return BUDGET_TYPES.find((t) => t.value === type)?.title ?? type ?? "";
}

/** The spent/consumed field name isn't fixed in the docs, so probe the usual suspects. */
function budgetSpent(budget: WalletBudget, currency: string) {
  for (const key of [
    "spent",
    "consumed",
    "currentAmount",
    "spentAmount",
    "progressAmount",
  ]) {
    const parsed = parseMoney(budget[key] as never, currency);
    if (parsed) return parsed;
  }
  return null;
}

export default function Budgets() {
  const { data: budgets, isLoading, revalidate } = useCachedPromise(getBudgets);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search budgets…">
      <List.EmptyView
        icon={Icon.Coins}
        title="No Budgets"
        description="Create your first budget with ⌘N"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Budget"
              icon={Icon.Plus}
              target={<CreateBudgetForm onDone={revalidate} />}
            />
          </ActionPanel>
        }
      />
      {(budgets ?? [])
        .filter((budget) => budget.closed !== true)
        .map((budget) => {
          const currency = budget.currencyCode ?? "";
          const limit = parseMoney(budget.limit as never, currency);
          const spent = budgetSpent(budget, currency);
          const ratio =
            limit && spent && limit.value > 0
              ? Math.abs(spent.value) / limit.value
              : null;
          return (
            <List.Item
              key={budget.id}
              icon={{
                source: Icon.Coins,
                tintColor:
                  ratio === null
                    ? Color.Blue
                    : ratio >= 1
                      ? Color.Red
                      : ratio >= 0.8
                        ? Color.Orange
                        : Color.Green,
              }}
              title={budget.name ?? budget.id}
              subtitle={budgetTypeTitle(budget.type)}
              accessories={[
                spent ? { text: `Spent: ${formatMoney(spent)}` } : {},
                ratio !== null
                  ? {
                      tag: {
                        value: `${Math.round(ratio * 100)} %`,
                        color:
                          ratio >= 1
                            ? Color.Red
                            : ratio >= 0.8
                              ? Color.Orange
                              : Color.Green,
                      },
                    }
                  : {},
                { text: limit ? `Limit: ${formatMoney(limit)}` : "—" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Create Budget"
                    icon={Icon.Plus}
                    target={<CreateBudgetForm onDone={revalidate} />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

function CreateBudgetForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();
  const { data: categories, isLoading } = useCachedPromise(getCategories);

  async function handleSubmit(values: {
    name: string;
    type: string;
    currencyCode: string;
    limit: string;
    categoryIds: string[];
  }) {
    const limit = Number(values.limit.replace(",", "."));
    if (!values.name.trim() || !Number.isFinite(limit) || limit <= 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Check the name and limit (> 0)",
      });
      return;
    }
    try {
      await createBudget({
        name: values.name.trim(),
        type: values.type,
        currencyCode: values.currencyCode.trim().toUpperCase(),
        limit,
        categoryIds:
          values.categoryIds.length > 0 ? values.categoryIds : undefined,
      });
      await showToast({ style: Toast.Style.Success, title: "Budget created" });
      onDone();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Could not create budget" });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Budget"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Budget"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Monthly groceries" />
      <Form.Dropdown
        id="type"
        title="Period"
        defaultValue="BUDGET_INTERVAL_MONTH"
      >
        {BUDGET_TYPES.map((type) => (
          <Form.Dropdown.Item
            key={type.value}
            value={type.value}
            title={type.title}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="currencyCode"
        title="Currency (ISO 4217)"
        placeholder="USD"
        defaultValue="EUR"
      />
      <Form.TextField id="limit" title="Limit" placeholder="400" />
      <Form.TagPicker id="categoryIds" title="Categories (empty = all)">
        {(categories ?? [])
          .filter(
            (category) =>
              category.archived !== true && category.enabled !== false,
          )
          .map((category) => (
            <Form.TagPicker.Item
              key={category.id}
              value={category.id}
              title={category.name ?? category.id}
              icon={{ source: Icon.Circle, tintColor: category.color }}
            />
          ))}
      </Form.TagPicker>
    </Form>
  );
}
