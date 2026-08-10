import { useCachedPromise } from '@raycast/utils';

import { Period } from '@srcTypes';
import { fetchTransactions } from '@lib/api';

export function useTransactions(budgetId: string | undefined, period: Period | undefined) {
  return useCachedPromise(fetchTransactions, [budgetId || '', period || 'month'], {
    keepPreviousData: true,
    execute: !!budgetId && !!period,
  });
}
