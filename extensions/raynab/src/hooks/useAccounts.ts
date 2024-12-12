import useSWR from 'swr';
import { fetchAccounts } from '@lib/api';

export function useAccounts(budgetId: string | undefined) {
  return useSWR(budgetId ? [budgetId, 'accounts'] : null, ([budgetId]) => fetchAccounts(budgetId));
}
