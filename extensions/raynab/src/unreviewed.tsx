import { UnreviewedTransactionView } from '@components/transactions/unreviewedTransactionView';
import { checkForActiveBudget } from '@lib/utils/checkForActiveBudget';

export default function Command() {
  const { activeBudgetId, isLoading } = checkForActiveBudget();

  if (isLoading) {
    return null;
  }

  if (!activeBudgetId) {
    return null;
  }

  return <UnreviewedTransactionView />;
}
