import useSWR from 'swr';
import { fetchBudget } from '@lib/api';

export function useBudget(budgetId = 'last-used') {
  return useSWR(budgetId, fetchBudget);
}
