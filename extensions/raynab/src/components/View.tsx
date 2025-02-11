import { ynabProvider } from '@lib/oauth';
import { useActiveBudget, useActiveBudgetCurrency } from '@hooks/useLocalValues';
import { withAccessToken } from '@raycast/utils';
import { useEffect, ReactNode } from 'react';
import { fetchBudget } from '@lib/api';
import { Detail, getPreferenceValues } from '@raycast/api';

const preferences = getPreferenceValues<Preferences>();

function BudgetWrapper({ children }: { children: ReactNode }) {
  const { activeBudgetId, setActiveBudgetId } = useActiveBudget();
  const { activeBudgetCurrency, setActiveBudgetCurrency } = useActiveBudgetCurrency();

  // When logging with OAuth, a default budget is automatically selected.
  // We need to set the local values to match it.
  useEffect(() => {
    async function setDefaultBudget() {
      // The user won't have a default budget selected if they're logging via an API token
      // So we need to use the last used budget instead
      const shouldUseLastUsedBudget = Boolean(preferences.apiToken);

      const budget = await fetchBudget(shouldUseLastUsedBudget ? 'last-used' : 'default');
      if (budget) {
        setActiveBudgetId(budget.id);
        if (budget.currency_format) {
          setActiveBudgetCurrency(budget.currency_format);
        }
      }
    }

    setDefaultBudget();
  }, [activeBudgetId, activeBudgetCurrency]);

  if (!activeBudgetId || !activeBudgetCurrency) {
    return <Detail isLoading />;
  }

  return <>{children}</>;
}

export default withAccessToken(ynabProvider)(BudgetWrapper);
