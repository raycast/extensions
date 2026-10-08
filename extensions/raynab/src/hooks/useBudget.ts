import { useCachedPromise } from '@raycast/utils';

import { fetchBudget } from '@lib/api';

export function useBudget(budgetId: string | undefined) {
  return useCachedPromise(fetchBudget, [budgetId || ''], { keepPreviousData: true, execute: !!budgetId });
}
