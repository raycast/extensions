import { fetchScheduledTransactions } from '@lib/api';
import { useCachedPromise } from '@raycast/utils';

export function useScheduledTransactions(budgetId: string | undefined) {
  return useCachedPromise(fetchScheduledTransactions, [budgetId || ''], {
    keepPreviousData: true,
    execute: !!budgetId,
  });
}
