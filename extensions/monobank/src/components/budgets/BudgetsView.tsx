import { Action, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { shortcuts } from "../../data/shortcuts";
import { useBudgetAccounts, useAccountStatements } from "../../hooks";
import { getBudgetMonth } from "../../utils";
import { showInvalidTokenToast } from "../TokenErrorEmptyView";
import BudgetAccountsForm from "./BudgetAccountsForm";
import BudgetList from "./BudgetList";

export type BudgetPeriod = "thisMonth" | "lastMonth";

/**
 * The saved budgets with their progress for This Month or Last Month across the budget accounts, updating their
 * statements itself. Used by Show Budgets and by "Manage Budgets…" in Show Statement. `navigationTitle` is only for
 * a pushed view: the command's own title shows at the root.
 */
export default function BudgetsView(props: { initialMonth?: BudgetPeriod; navigationTitle?: string }) {
  const { initialMonth = "thisMonth", navigationTitle } = props;
  const [preset, setPreset] = useState<BudgetPeriod>(initialMonth);
  const period = useMemo(() => ({ preset }), [preset]);
  const month = useMemo(() => getBudgetMonth(period), [period]);

  const budgetAccounts = useBudgetAccounts();
  const statements = useAccountStatements(budgetAccounts.accounts, period, { sync: true });
  const tokenError = budgetAccounts.tokenError ?? statements.tokenError;

  useEffect(() => {
    if (tokenError === "invalid") showInvalidTokenToast();
  }, [tokenError]);

  return (
    <BudgetList
      accounts={budgetAccounts.accounts ?? []}
      groups={statements.groups}
      month={month}
      navigationTitle={navigationTitle}
      isLoading={budgetAccounts.isLoading || statements.isLoading}
      isPartial={statements.isPartial}
      oldestSyncedAt={statements.oldestSyncedAt}
      note={tokenError ? "Add a valid access token to see spending" : undefined}
      actions={
        <>
          <Action
            title={preset === "thisMonth" ? "Show Last Month" : "Show This Month"}
            icon={Icon.Calendar}
            shortcut={shortcuts.changePeriod}
            onAction={() => setPreset((preset) => (preset === "thisMonth" ? "lastMonth" : "thisMonth"))}
          />
          <Action.Push
            title="Choose Accounts…"
            icon={Icon.CreditCard}
            shortcut={shortcuts.chooseAccounts}
            target={<BudgetAccountsForm />}
          />
          {!tokenError && (
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={shortcuts.refresh}
              onAction={statements.refresh}
            />
          )}
        </>
      }
    />
  );
}
