import useSWR from 'swr';
import { fetchBudget } from '@lib/api';

export function useBudget(budgetId: string | undefined) {
  return useSWR(budgetId || null, fetchBudget);
}
