import { TransactionView } from '@components/transactions/transactionView';
import { LaunchProps } from '@raycast/api';

export default function Command(props: LaunchProps) {
  return <TransactionView search={props.launchContext?.search ?? ''} filter={props.launchContext?.filter} />;
}
