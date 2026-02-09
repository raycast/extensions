import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { toshl } from "./utils/toshl";
import { format, subDays, addDays, isWithinInterval, parseISO } from "date-fns";
import { formatCurrency } from "./utils/helpers";

export default function Budgets() {
  // Fetch budgets for a wide range to ensure we get current iterations
  const today = new Date();
  const sixtyDaysAgo = format(subDays(today, 60), "yyyy-MM-dd");
  const sixtyDaysFromNow = format(addDays(today, 60), "yyyy-MM-dd");

  const { data: budgets, isLoading } = useCachedPromise(() =>
    toshl.getBudgets({ from: sixtyDaysAgo, to: sixtyDaysFromNow }),
  );
  const { data: categories } = useCachedPromise(() => toshl.getCategories());

  // Check if budget period includes today
  function isCurrentBudget(budget: { from: string; to: string }) {
    try {
      const fromDate = parseISO(budget.from);
      const toDate = parseISO(budget.to);
      return isWithinInterval(today, { start: fromDate, end: toDate });
    } catch {
      return false;
    }
  }

  function getCategoryNames(ids?: string[]) {
    if (!ids || ids.length === 0) return "All Categories";
    return ids.map((id) => categories?.find((c) => c.id === id)?.name || "Unknown").join(", ");
  }

  function getBudgetProgress(budget: { amount: number; limit: number }) {
    if (budget.limit === 0) return 0;
    return Math.min(budget.amount / budget.limit, 1);
  }

  function getBudgetColor(budget: { amount: number; limit: number }) {
    const progress = getBudgetProgress(budget);
    if (progress >= 1) return Color.Red;
    if (progress >= 0.8) return Color.Orange;
    if (progress >= 0.5) return Color.Yellow;
    return Color.Green;
  }

  function formatRecurrence(budget: { recurrence?: { frequency: string; interval: number } }) {
    if (!budget.recurrence) return "One-time";
    const { frequency, interval } = budget.recurrence;
    if (interval === 1) {
      return frequency.charAt(0).toUpperCase() + frequency.slice(1);
    }
    return `Every ${interval} ${frequency}`;
  }

  // Filter to only show active budgets whose period includes today
  const currentBudgets = budgets
    ?.filter((b) => b.status === "active" && isCurrentBudget(b))
    .sort((a, b) => a.order - b.order);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Current Budgets">
        {currentBudgets?.map((budget) => {
          const remaining = budget.limit - budget.amount;
          const progress = getBudgetProgress(budget);

          return (
            <List.Item
              key={budget.id}
              icon={{ source: Icon.Coins, tintColor: getBudgetColor(budget) }}
              title={budget.name}
              subtitle={getCategoryNames(budget.categories)}
              accessories={[
                {
                  text: `${formatCurrency(budget.amount, budget.currency.code)} / ${formatCurrency(budget.limit, budget.currency.code)}`,
                },
                {
                  text: remaining >= 0 ? `${remaining.toFixed(0)} left` : `${Math.abs(remaining).toFixed(0)} over`,
                  icon: remaining >= 0 ? Icon.CheckCircle : Icon.ExclamationMark,
                },
                { tag: { value: `${(progress * 100).toFixed(0)}%`, color: getBudgetColor(budget) } },
                ...(budget.recurrence
                  ? [
                      {
                        icon: Icon.ArrowClockwise,
                        tooltip: `${formatRecurrence(budget)} (${budget.from} to ${budget.to})`,
                      },
                    ]
                  : []),
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Budget" text={budget.name} />
                      <List.Item.Detail.Metadata.Label
                        title="Limit"
                        text={formatCurrency(budget.limit, budget.currency.code)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Spent"
                        text={formatCurrency(budget.amount, budget.currency.code)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Remaining"
                        text={formatCurrency(remaining, budget.currency.code)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Period" text={`${budget.from} to ${budget.to}`} />
                      <List.Item.Detail.Metadata.Label title="Recurrence" text={formatRecurrence(budget)} />
                      <List.Item.Detail.Metadata.Label
                        title="Rollover"
                        text={budget.rollover ? "Enabled" : "Disabled"}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Toshl" url={`https://toshl.com/app/#/budgets/${budget.id}`} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
