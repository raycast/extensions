import { type ReactNode, useMemo, useState } from "react";
import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import {
  type Allocation,
  type Budget,
  type Expense,
  createExpense,
  deleteExpenses,
  getExchangeRates,
  listExpenses,
} from "./cushn";
import {
  type CurrencyRegistry,
  ParseError,
  type ParsedResult,
  createBudgetCurrencyRegistry,
  parseInputLenient,
} from "./expressionParser";
import { formatMoney, leftText } from "./format";
import { OpenCushnAction } from "./open-cushn-action";
import { LoadErrorView } from "./views";

type Draft = { parsed: ParsedResult } | { error: string } | null;

function parseDraft(input: string, currencies: CurrencyRegistry): Draft {
  try {
    const parsed = parseInputLenient(input, { currencies });
    return parsed && { parsed };
  } catch (error) {
    if (error instanceof ParseError) return { error: error.message };
    throw error;
  }
}

export function Expenses({ budget, allocation }: { budget: Budget; allocation: Allocation }) {
  const currency = budget.currency;
  const money = (amount: number) => formatMoney(amount, currency);
  const [input, setInput] = useState("");

  const expenses = usePromise(listExpenses, [budget.id, allocation.id], {
    failureToastOptions: { title: "Couldn't load expenses" },
  });
  const rates = usePromise(getExchangeRates, [], { onError: () => undefined });
  const currencies = useMemo(
    () => createBudgetCurrencyRegistry(currency, rates.data?.exchangeRates?.rates),
    [currency, rates.data],
  );
  const draft = useMemo(() => parseDraft(input, currencies), [input, currencies]);

  const spent = expenses.data ? expenses.data.reduce((sum, expense) => sum + expense.amount, 0) : allocation.spent;

  async function add({ title, amount }: ParsedResult) {
    const typed = input;
    setInput("");
    const toast = await showToast({ style: Toast.Style.Animated, title: `Adding ${title}…` });
    try {
      const expenseIds = await expenses.mutate(
        createExpense({ budgetId: budget.id, allocationId: allocation.id, title, amount }),
        { optimisticUpdate: (data = []) => [{ id: "new", title, amount, createdAt: Date.now() }, ...data] },
      );

      let undone = false;
      toast.style = Toast.Style.Success;
      toast.title = `Added ${title}, ${money(amount)}`;
      toast.primaryAction = {
        title: "Undo",
        onAction: async (undoToast) => {
          if (undone) return;
          undone = true;
          try {
            await expenses.mutate(deleteExpenses(expenseIds), {
              optimisticUpdate: (data = []) => data.filter((expense) => !expenseIds.includes(expense.id)),
            });
            undoToast.style = Toast.Style.Success;
            undoToast.title = `Removed ${title}`;
            undoToast.primaryAction = undefined;
          } catch (error) {
            undone = false;
            await showFailureToast(error, { title: `Couldn't remove ${title}` });
          }
        },
      };
    } catch (error) {
      setInput((current) => current || typed);
      await showFailureToast(error, { title: `Couldn't add ${title}` });
    }
  }

  return (
    <List
      isLoading={expenses.isLoading}
      navigationTitle={`${budget.title} · ${allocation.categoryName}`}
      searchBarPlaceholder="Add expense, e.g. Coffee 20k + 5k or Rent 200 usd"
      searchText={input}
      onSearchTextChange={setInput}
      filtering={false}
    >
      {draft && (
        <List.Section title="New Expense">
          <DraftItem draft={draft} currency={currency} attribution={rates.data?.attribution.label} onAdd={add} />
        </List.Section>
      )}
      {expenses.error && !expenses.data ? (
        <LoadErrorView title="Couldn't load expenses" error={expenses.error} onRetry={expenses.revalidate} />
      ) : (
        <List.EmptyView icon={Icon.Coins} title="No expenses yet" description="Type one above, e.g. Coffee 20" />
      )}
      <List.Section title="Expenses" subtitle={leftText(allocation.amount - spent, allocation.amount, currency)}>
        {expenses.data?.map((expense) => (
          <ExpenseItem key={expense.id} expense={expense} currency={currency} />
        ))}
      </List.Section>
    </List>
  );
}

function DraftItem(props: {
  draft: NonNullable<Draft>;
  currency: string;
  attribution: string | undefined;
  onAdd: (parsed: ParsedResult) => void;
}) {
  if ("error" in props.draft) {
    return <List.Item icon={Icon.Warning} title="Can't read this expense" subtitle={props.draft.error} />;
  }
  const { parsed } = props.draft;
  if (!parsed.title) {
    return <List.Item icon={Icon.Pencil} title="Add a title" subtitle="e.g. Coffee 20" />;
  }
  const base = props.currency.toLowerCase();
  const converted = parsed.currencies.some((code) => code !== base);
  return (
    <List.Item
      icon={Icon.Plus}
      title={parsed.title}
      subtitle={
        converted
          ? `Converted to ${base.toUpperCase()}${props.attribution ? ` · ${props.attribution}` : ""}`
          : undefined
      }
      accessories={[{ text: `${converted ? "≈ " : ""}${formatMoney(parsed.amount, props.currency)}` }]}
      actions={
        <ActionPanel>
          <Action title="Add Expense" icon={Icon.Plus} onAction={() => props.onAdd(parsed)} />
        </ActionPanel>
      }
    />
  );
}

export function ExpenseItem(props: { expense: Expense; currency: string; actions?: ReactNode }) {
  const { expense, currency } = props;
  return (
    <List.Item
      title={expense.title || "Untitled"}
      accessories={[{ text: formatMoney(expense.amount, currency) }, { date: new Date(expense.createdAt) }]}
      actions={
        <ActionPanel>
          {props.actions}
          <Action.CopyToClipboard
            title="Copy Amount"
            content={String(expense.amount)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Title"
            content={expense.title}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          />
          <OpenCushnAction />
        </ActionPanel>
      }
    />
  );
}
