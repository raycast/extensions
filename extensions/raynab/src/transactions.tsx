import { TransactionView } from '@components/transactions/transactionView';
import { checkForActiveBudget } from '@lib/utils/checkForActiveBudget';
import { LaunchProps } from '@raycast/api';

export default function Command(props: LaunchProps) {
  const { activeBudgetId } = checkForActiveBudget();

  if (!activeBudgetId) {
    return null;
  }

  return <TransactionView search={props.launchContext?.search ?? ''} filter={props.launchContext?.filter} />;
}
