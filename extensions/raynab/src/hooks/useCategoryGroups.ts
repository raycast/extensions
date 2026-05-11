import { useCachedPromise } from '@raycast/utils';

import { fetchCategoryGroups } from '@lib/api';

export function useCategoryGroups(budgetId: string | undefined) {
  return useCachedPromise(fetchCategoryGroups, [budgetId || ''], { keepPreviousData: true, execute: !!budgetId });
}
