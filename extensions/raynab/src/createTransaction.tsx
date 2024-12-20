import { SWRConfig } from 'swr';

import { cacheConfig } from '@lib/cache';
import { TransactionCreateForm } from '@components/transactions/transactionCreateForm';

export default function Command() {
  return (
    <SWRConfig value={cacheConfig}>
      <TransactionCreateForm />
    </SWRConfig>
  );
}
