import { SWRConfig } from 'swr';

import { cacheConfig } from '@lib/cache';
import { ScheduleTransactionCreateForm } from '@components/transactions/scheduledTransactionCreateForm';

export default function Command() {
  return (
    <SWRConfig value={cacheConfig}>
      <ScheduleTransactionCreateForm />
    </SWRConfig>
  );
}
