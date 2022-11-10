import { ActionPanel, List, Action } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';
import Service, { Domain } from './service';
import { getDomainUrl, getToken, handleNetworkError } from './utils';

const service = new Service(getToken());

export default function Command() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const domainMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const domain of domains) {
      const { value, team } = domain;
      if (!map[team.id]) {
        map[team.id] = [];
      }
      map[team.id].push(value);
    }
    return map;
  }, [domains]);

  const teams = useMemo(() => {
    const map: Record<string, string> = {};
    for (const domain of domains) {
      const { id, name } = domain.team;
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
        const domains = await service.getDomains();
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
