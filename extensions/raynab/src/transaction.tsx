import { SWRConfig } from 'swr';

import { cacheConfig } from '@lib/cache';
import { TransactionCreationForm } from '@components/transactions/transactionCreationForm';

export default function Command() {
  return (
    <SWRConfig value={cacheConfig}>
      <TransactionCreationForm />
    </SWRConfig>
  );
}
