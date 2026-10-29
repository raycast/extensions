import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { changeBudget, type BudgetWithCategory } from "../lib/budgets";
import type { Category } from "../lib/types";

const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });

export function BudgetForm(props: {
  categories: Category[];
  budgets: BudgetWithCategory[];
  editing?: BudgetWithCategory;
  onSaved: (categoryId: number) => void | Promise<void>;
  fromDetails?: boolean;
}) {
  const { pop } = useNavigation();
  const [categoryId, setCategoryId] = useState(String(props.editing?.category_id ?? ""));
  const [amount, setAmount] = useState(String(props.editing?.amount ?? ""));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const byId = new Map(props.categories.map((category) => [category.id, category]));
  const available = props.categories
    .filter((category) => category.category_type === "expense")
    .filter((category) =>
      props.editing
        ? category.id === props.editing.category_id
        : !props.budgets.some((budget) => budget.category_id === category.id),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  async function submit() {
    setError(undefined);
    const category = byId.get(Number(categoryId));
    if (!category) return setError("Choose an expense category");
    if (!/^\d+$/.test(amount.trim()) || !Number.isSafeInteger(Number(amount)) || Number(amount) <= 0)
      return setError("Enter a positive whole number of yen");
    setSaving(true);
    try {
      if (props.editing && category.id !== props.editing.category_id) {
        return setError("To budget a different category, create a new budget instead");
      }
      await changeBudget(props.editing ? "update" : "create", category.id, Number(amount));
      await props.onSaved(category.id);
      pop();
      if (props.fromDetails) pop();
      await showToast({ style: Toast.Style.Success, title: `${category.name}: ${yen.format(Number(amount))} saved` });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to save budget";
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "Budget not saved", message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form
      isLoading={saving}
      navigationTitle={props.editing ? `Edit ${props.editing.category.name} Budget` : "Create Budget"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.editing ? "Save Budget" : "Create Budget"}
            icon={Icon.Checkmark}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="category" title="Expense Category" value={categoryId} onChange={setCategoryId}>
        <Form.Dropdown.Item value="" title="Choose a category" />
        {available.map((category) => (
          <Form.Dropdown.Item
            key={category.id}
            value={String(category.id)}
            title={`${category.parent_id ? `${byId.get(category.parent_id)?.name ?? "Other"} / ` : ""}${category.name}`}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="amount"
        title="Budget Limit (JPY)"
        placeholder="10000"
        value={amount}
        onChange={setAmount}
        error={error}
      />
      <Form.Description text="This sets the saved Moneytree category limit, not spending or remaining balance." />
    </Form>
  );
}
