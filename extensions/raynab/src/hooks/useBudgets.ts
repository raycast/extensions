import { useCachedPromise } from '@raycast/utils';

import { fetchBudgets } from '@lib/api';

export function useBudgets() {
  return useCachedPromise(fetchBudgets);
}
