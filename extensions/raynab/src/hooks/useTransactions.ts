import { Period } from '@srcTypes';
import useSWR from 'swr';
import { fetchTransactions } from '@lib/api';

export function useTransactions(budgetId: string | undefined, period: Period) {
  return useSWR(budgetId ? [budgetId, period] : null, (keys) => fetchTransactions(...keys));
}
