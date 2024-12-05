import { SWRConfig } from 'swr';

import { cacheConfig } from '@lib/cache';
import { TransactionView } from '@components/transactions/transactionView';
import { LaunchProps } from '@raycast/api';

export default function Command(props: LaunchProps) {
  return (
    <SWRConfig value={cacheConfig}>
      <TransactionView search={props.launchContext?.search ?? ''} />
    </SWRConfig>
  );
}
