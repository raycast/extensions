import { useLocalStorage } from '@raycast/utils';
import { CurrencyFormat, Period } from '@srcTypes';

function useActiveBudget() {
  const {
    value: activeBudgetId,
    setValue: setActiveBudgetId,
    isLoading: isLoadingActiveBudgetId,
  } = useLocalStorage('activeBudgetId', '');
  return { activeBudgetId: activeBudgetId ?? '', setActiveBudgetId, isLoadingActiveBudgetId };
}

function useActiveBudgetCurrency() {
  const {
    value: activeBudgetCurrency,
    setValue: setActiveBudgetCurrency,
    isLoading: isLoadingActiveBudgetCurrency,
  } = useLocalStorage<CurrencyFormat | null>('activeBudgetCurrency', null);

  return { activeBudgetCurrency: activeBudgetCurrency ?? null, setActiveBudgetCurrency, isLoadingActiveBudgetCurrency };
}

function useTimeline() {
  const {
    value: timeline,
    setValue: setTimeline,
    isLoading: isLoadingTimeline,
  } = useLocalStorage<Period>('timeline', 'month');

  return { timeline, setTimeline, isLoadingTimeline };
}

export { useActiveBudget, useActiveBudgetCurrency, useTimeline };
