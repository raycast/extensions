import { useCachedPromise } from '@raycast/utils';

import { fetchAccounts } from '@lib/api';

export function useAccounts(budgetId: string | undefined) {
  return useCachedPromise(fetchAccounts, [budgetId || ''], { keepPreviousData: true, execute: !!budgetId });
}
