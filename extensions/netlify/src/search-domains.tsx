import { ActionPanel, Icon, List } from '@raycast/api';
import { useEffect, useState } from 'react';

import { OpenOnNetlify } from './components/actions';
import api from './utils/api';
import { getDomainUrl, handleNetworkError } from './utils/helpers';
import { formatDate } from './utils/helpers';
import { Domain } from './utils/interfaces';

export default function Command() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchDomains() {
      try {
        const domains = await api.getDomains();
        setDomains(domains);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchDomains();
  }, []);

  return (
    <List isLoading={isLoading}>
      {domains.map((domain) => (
        <List.Item
          key={domain.name}
          icon={Icon.Globe}
          title={domain.name}
          subtitle={domain.account_name}
          keywords={domain.account_slug.split('-')}
          accessories={[
            {
              text: formatDate(domain.created_at),
              tooltip: 'Date created',
            },
          ]}
          actions={
            <ActionPanel>
              <OpenOnNetlify
                url={getDomainUrl(domain.account_slug, domain.name)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
