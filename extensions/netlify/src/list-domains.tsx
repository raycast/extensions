import { ActionPanel, List, Action } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';

import api from './utils/api';
import { getDomainUrl, handleNetworkError } from './utils/helpers';
import { Domain } from './utils/interfaces';

export default function Command() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const domainMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const domain of domains) {
      const { name, account_slug: teamId } = domain;
      if (!map[teamId]) {
        map[teamId] = [];
      }
      map[teamId].push(name);
    }
    return map;
  }, [domains]);

  const teams = useMemo(() => {
    const map: Record<string, string> = {};
    for (const domain of domains) {
      const { account_slug: id, account_name: name } = domain;
      if (map[id]) {
        continue;
      }
      map[id] = name;
    }
    return map;
  }, [domains]);

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
      {Object.keys(domainMap).map((team) => {
        return (
          <List.Section key={team} title={teams[team]}>
            {domainMap[team].map((domain) => (
              <List.Item
                key={domain}
                title={domain}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open on Netlify"
                      url={getDomainUrl(team, domain)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
