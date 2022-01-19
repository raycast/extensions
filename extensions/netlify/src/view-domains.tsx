import { ActionPanel, List, ListItem, ListSection, OpenInBrowserAction } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import Service, { Domain } from "./service";
import { getDomainUrl, getToken } from "./utils";

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
      const domains = await service.getDomains();
      setDomains(domains);
      setLoading(false);
    }

    fetchDomains();
  }, []);

  return (
    <List isLoading={isLoading}>
      {Object.keys(domainMap).map((team) => {
        return (
          <ListSection key={team} title={teams[team]}>
            {domainMap[team].map((domain) => (
              <ListItem
                key={domain}
                title={domain}
                actions={
                  <ActionPanel>
                    <OpenInBrowserAction title="Open in Netlify" url={getDomainUrl(domain)} />
                  </ActionPanel>
                }
              />
            ))}
          </ListSection>
        );
      })}
    </List>
  );
}
