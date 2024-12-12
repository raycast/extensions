import useSWR from 'swr';
import { fetchCategoryGroups } from '@lib/api';

export function useCategoryGroups(budgetId: string | undefined) {
  return useSWR(budgetId ? [budgetId, 'categoryGroups'] : null, ([budgetId]) => fetchCategoryGroups(budgetId));
}
