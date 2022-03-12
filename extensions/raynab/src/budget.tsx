import { SWRConfig } from 'swr';

import { cacheConfig } from '@lib/cache';
import { BudgetView } from '@components/budgets/budgetView';

export default function Command() {
  return (
    <SWRConfig value={cacheConfig}>
      <BudgetView />
    </SWRConfig>
  );
}
