import { SWRConfig } from 'swr';

import { cacheConfig } from '@lib/cache';
import { TransactionView } from '@components/transactions/transactionView';

export default function Command() {
  return (
    <SWRConfig value={cacheConfig}>
      <TransactionView />
    </SWRConfig>
  );
}
