import useSWR from 'swr';
import { fetchCategoryGroups } from '@lib/api';

export function useCategoryGroups(budgetId = 'last-used') {
  return useSWR([budgetId, 'categoryGroups'], fetchCategoryGroups);
}
