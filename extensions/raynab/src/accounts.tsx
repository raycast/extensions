import { SWRConfig } from 'swr';

import { cacheConfig } from '@lib/cache';
import { AccountView } from '@components/accounts/accountView';

export default function Command() {
  return (
    <SWRConfig value={cacheConfig}>
      <AccountView />
    </SWRConfig>
  );
}
