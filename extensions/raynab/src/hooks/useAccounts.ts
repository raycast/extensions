import useSWR from 'swr';
import { fetchAccounts } from '@lib/api';

export function useAccounts(budgetId = 'last-used') {
  return useSWR([budgetId, 'accounts'], fetchAccounts);
}
