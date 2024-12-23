import { useCachedPromise } from '@raycast/utils';

import { Period } from '@srcTypes';
import { fetchTransactions } from '@lib/api';

export function useTransactions(budgetId: string | undefined, period: Period) {
  return useCachedPromise(fetchTransactions, [budgetId || '', period], { keepPreviousData: true, execute: !!budgetId });
}
