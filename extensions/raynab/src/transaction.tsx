import { TransactionCreateForm } from '@components/transactions/transactionCreateForm';
import { LaunchProps } from '@raycast/api';

export default function Command(props: LaunchProps) {
  const { categoryId, accountId, transaction } = props.launchContext || {};

  return <TransactionCreateForm categoryId={categoryId} accountId={accountId} transaction={transaction} />;
}
