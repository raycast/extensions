import { UnreviewedTransactionView } from '@components/transactions/unreviewedTransactionView';
import { checkForActiveBudget } from '@lib/utils/checkForActiveBudget';

export default function Command() {
  const { activeBudgetId } = checkForActiveBudget();

  if (!activeBudgetId) {
    return null;
  }

  return <UnreviewedTransactionView />;
}
