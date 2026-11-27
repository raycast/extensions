import { Action, ActionPanel, Icon, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { TransactionBudgetChange } from "../../services/budgets";
import { Budget, Transaction } from "../../types";
import { countsToward, getTransactionBudgets } from "../../utils";

export type SetTransactionBudgets = (transaction: Transaction, changes: TransactionBudgetChange[]) => Promise<void>;

/** Corrections of which budgets count a statement transaction, whatever its category. */
export default function TransactionBudgetActions(props: {
  transaction: Transaction;
  budgets: Budget[];
  onSetBudgets: SetTransactionBudgets;
}) {
  const { transaction, budgets, onSetBudgets } = props;
  const { counted } = getTransactionBudgets(budgets, transaction);
  const countedIds = new Set(counted.map(({ budget }) => budget.id));
  const notCounted = budgets.filter((budget) => !countedIds.has(budget.id));
  // Moving to the only budget that counts it would change nothing.
  const moveTargets = counted.length === 1 ? notCounted : budgets;

  async function apply(title: string, changes: TransactionBudgetChange[]) {
    // What each budget did before, so Undo puts it back as it was, by category or by hand.
    const undo = changes.map(({ budgetId }) => {
      const budget = budgets.find((other) => other.id === budgetId)!;
      return { budgetId, counted: countsToward(budget, transaction) };
    });

    try {
      await onSetBudgets(transaction, changes);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to change budgets" });
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title,
      message: transaction.description,
      primaryAction: {
        title: "Undo",
        onAction: async (toast) => {
          await onSetBudgets(transaction, undo);
          await toast.hide();
        },
      },
    });
  }

  function move(target: Budget) {
    const changes = counted
      .filter(({ budget }) => budget.id !== target.id)
      .map(({ budget }) => ({ budgetId: budget.id, counted: false }));
    if (!countedIds.has(target.id)) changes.push({ budgetId: target.id, counted: true });
    return apply(`Moved to ${target.name}`, changes);
  }

  return (
    <ActionPanel.Section title="Budgets">
      {notCounted.length > 0 && (
        <ActionPanel.Submenu title="Add to Budget" icon={Icon.PlusCircle}>
          {notCounted.map((budget) => (
            <Action
              key={budget.id}
              title={budget.name}
              onAction={() => apply(`Added to ${budget.name}`, [{ budgetId: budget.id, counted: true }])}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      {counted.length > 0 && (
        <ActionPanel.Submenu title="Remove from Budget" icon={Icon.MinusCircle}>
          {counted.map(({ budget, reason }) => (
            <Action
              key={budget.id}
              title={`${budget.name} (${reason === "added" ? "added" : "by category"})`}
              onAction={() => apply(`Removed from ${budget.name}`, [{ budgetId: budget.id, counted: false }])}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      {moveTargets.length > 0 && (
        <ActionPanel.Submenu title="Move to Budget" icon={Icon.ArrowRight}>
          {moveTargets.map((budget) => (
            <Action key={budget.id} title={budget.name} onAction={() => move(budget)} />
          ))}
        </ActionPanel.Submenu>
      )}
    </ActionPanel.Section>
  );
}
