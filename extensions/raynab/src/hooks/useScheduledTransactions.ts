import useSWR from 'swr';
import { fetchScheduledTransactions } from '@lib/api';

export function useScheduledTransactions(budgetId: string | undefined) {
  return useSWR(budgetId ? [budgetId, 'scheduledTransactions'] : null, ([budetId]) =>
    fetchScheduledTransactions(budetId)
  );
}
