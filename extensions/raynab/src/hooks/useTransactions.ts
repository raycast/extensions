import { Period } from '@srcTypes';
import useSWR from 'swr';
import { fetchTransactions } from '@lib/api';

export function useTransactions(budgetId = 'last-used', period: Period) {
  return useSWR([budgetId, period], fetchTransactions);
}
