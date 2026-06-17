import { useCachedPromise } from '@raycast/utils';

import { fetchPayees } from '@lib/api';

export function usePayees(budgetId: string | undefined) {
  return useCachedPromise(fetchPayees, [budgetId || ''], { keepPreviousData: true, execute: !!budgetId });
}
