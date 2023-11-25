import useSWR from 'swr';
import { fetchBudgets } from '@lib/api';

export function useBudgets() {
  return useSWR('budgets', fetchBudgets);
}
