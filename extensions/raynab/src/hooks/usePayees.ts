import useSWR from 'swr';
import { fetchPayees } from '@lib/api';

export function usePayees(budgetId: string | undefined) {
  return useSWR(budgetId ? [budgetId, 'payees'] : null, ([budgetId]) => fetchPayees(budgetId));
}
