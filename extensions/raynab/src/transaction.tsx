import { TransactionCreateForm } from '@components/transactions/transactionCreateForm';
import { checkForActiveBudget } from '@lib/utils/checkForActiveBudget';
import { LaunchProps } from '@raycast/api';

export default function Command(props: LaunchProps) {
  const { activeBudgetId } = checkForActiveBudget();

  if (!activeBudgetId) {
    return null;
  }

  const { categoryId, accountId, transaction } = props.launchContext || {};
  return <TransactionCreateForm categoryId={categoryId} accountId={accountId} transaction={transaction} />;
}
