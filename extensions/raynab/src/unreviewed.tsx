import { SWRConfig } from 'swr';

import { cacheConfig } from '@lib/cache';
import { UnreviewedTransactionView } from '@components/transactions/unreviewedTransactionView';

export default function Command() {
  return (
    <SWRConfig value={cacheConfig}>
      <UnreviewedTransactionView />
    </SWRConfig>
  );
}
