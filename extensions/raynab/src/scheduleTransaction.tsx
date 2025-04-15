import { ScheduleTransactionCreateForm } from '@components/transactions/scheduledTransactionCreateForm';
import { checkForActiveBudget } from '@lib/utils/checkForActiveBudget';

export default function Command() {
  const { activeBudgetId } = checkForActiveBudget();

  if (!activeBudgetId) {
    return null;
  }

  return <ScheduleTransactionCreateForm />;
}
