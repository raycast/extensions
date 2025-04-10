import { ScheduleTransactionCreateForm } from '@components/transactions/scheduledTransactionCreateForm';
import { checkForActiveBudget } from '@lib/utils/checkForActiveBudget';

export default function Command() {
  const { activeBudgetId, isLoading } = checkForActiveBudget();

  if (isLoading) {
    return null;
  }

  if (!activeBudgetId) {
    return null;
  }

  return <ScheduleTransactionCreateForm />;
}
