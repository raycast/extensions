import { TransactionView } from '@components/transactions/transactionView';
import View from '@components/View';
import { LaunchProps } from '@raycast/api';

export default function Command(props: LaunchProps) {
  return (
    <View>
      <TransactionView search={props.launchContext?.search ?? ''} filter={props.launchContext?.filter} />
    </View>
  );
}
