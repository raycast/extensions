import useSWR from 'swr';
import { fetchPayees } from '@lib/api';

export function usePayees(budgetId = 'last-used') {
  return useSWR([budgetId, 'payees'], fetchPayees);
}
