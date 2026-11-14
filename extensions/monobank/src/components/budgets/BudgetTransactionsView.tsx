import { Color, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import { useAccountStatements, useBudgetAccounts, useBudgets } from "../../hooks";
import {
  BudgetCountedTransaction,
  getBudgetIcon,
  getBudgetMonth,
  getBudgetProgress,
  getBudgetTransactions,
} from "../../utils";
import CountedTransactionsList from "../statement/CountedTransactionsList";
import { BudgetPeriod } from "./BudgetsView";

const NO_ENTRIES: BudgetCountedTransaction[] = [];
const ADDED_TAG: List.Item.Accessory = {
  tag: { value: "Added", color: Color.SecondaryText },
  tooltip: "Added to the budget by hand",
};

/**
 * The transactions a budget counts in `month` across the budget accounts, which add up to its spending, then the
 * ones excluded from it by hand. Corrections made here show at once: "Remove from Budget" moves a transaction to
 * Excluded, and "Add to Budget" there brings it back.
 *
 * Nothing is requested here: the budgets underneath stay mounted and keep the statements up to date, and this reads
 * them again as they're stored.
 */
export default function BudgetTransactionsView(props: { budgetId: string; month: BudgetPeriod }) {
  const { budgetId, month: preset } = props;
  const period = useMemo(() => ({ preset }), [preset]);
  const month = useMemo(() => getBudgetMonth(period), [period]);

  const { budgets, isLoading: isLoadingBudgets } = useBudgets();
  const budget = budgets.find((item) => item.id === budgetId);
  const budgetAccounts = useBudgetAccounts();
  const statements = useAccountStatements(budgetAccounts.accounts, period);

  const transactions = useMemo(
    () => (budget && month ? getBudgetTransactions(budget, statements.groups, month) : undefined),
    [budget, statements.groups, month],
  );
  // Only for the ring: the total is of the transactions listed.
  const progress = useMemo(() => {
    if (!budget || !month) return undefined;
    const groups = statements.groups.map(({ account, transactions }) => ({ accountId: account.id, transactions }));
    return getBudgetProgress([budget], groups, month)[0];
  }, [budget, statements.groups, month]);

  const title = budget?.name ?? "Budget";

  return (
    <CountedTransactionsList
      navigationTitle={[title, month?.label].filter(Boolean).join(" · ")}
      isLoading={isLoadingBudgets || budgetAccounts.isLoading || statements.isLoading}
      title={title}
      icon={progress ? getBudgetIcon(progress) : { source: Icon.Coins, tintColor: Color.SecondaryText }}
      entries={transactions?.counted ?? NO_ENTRIES}
      excluded={transactions?.excluded}
      isFloored
      note={statements.isPartial ? "Partial: older transactions not loaded" : undefined}
      getTag={(entry) => (entry.match === "added" ? ADDED_TAG : undefined)}
      emptyDescription={month && `Nothing in this budget's categories in ${month.label}.`}
    />
  );
}
