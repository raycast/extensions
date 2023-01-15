import { ActionPanel, Color, Icon, List } from '@raycast/api';
import { useCachedState } from '@raycast/utils';
import { useEffect, useState } from 'react';

import { OpenOnNetlify } from './components/actions';
import TeamDropdown from './components/team-dropdown';
import api from './utils/api';
import { getDomainUrl, handleNetworkError } from './utils/helpers';
import { formatDate } from './utils/helpers';
import { Domain, Team } from './utils/interfaces';

export default function Command() {
  const [isLoading, setLoading] = useState<boolean>(true);

  const [teams, setTeams] = useState<Team[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);

  const [selectedTeam, setSelectedTeam] = useCachedState<string>(
    'selectedTeam',
    '',
  );

  async function fetchDomains(team: string) {
    setLoading(true);
    try {
      const domains = await api.getDomains(team);
      setDomains(domains);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      handleNetworkError(e);
    }
  }

  async function fetchTeams() {
    try {
      const teams = await api.getTeams();
      setTeams(teams);
    } catch (e) {
      // ignore silently
    }
  }

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchDomains(selectedTeam);
  }, [selectedTeam]);

  const teamDropdown = (
    <TeamDropdown
      selectedTeam={selectedTeam || ''}
      setSelectedTeam={setSelectedTeam}
      teams={teams}
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={teams.length > 1 ? teamDropdown : undefined}
    >
      {domains.map((domain) => (
        <List.Item
          key={domain.name}
          icon={Icon.Globe}
          title={domain.name}
          subtitle={domain.account_name}
          keywords={domain.account_slug.split('-')}
          // @ts-expect-error idk how to fix
          accessories={
            domain.domain
              ? [
                  domain.domain?.auto_renew &&
                    domain.domain?.renewal_price && {
                      text: `$${domain.domain?.renewal_price}`,
                    },
                  domain.domain?.auto_renew && {
                    tag: { color: Color.Blue, value: 'Auto-renew' },
                    tooltip: `Auto-renews on ${formatDate(
                      domain.domain?.auto_renew_at,
                    )} for $${domain.domain?.renewal_price}`,
                  },
                  !domain.domain?.auto_renew &&
                    new Date(domain.domain?.expires_at) > new Date() && {
                      tag: { color: Color.Orange, value: 'Expiring' },
                      tooltip: `Expires on ${formatDate(
                        domain.domain?.expires_at,
                      )}`,
                    },
                  !domain.domain?.auto_renew &&
                    new Date(domain.domain?.expires_at) <= new Date() && {
                      tag: { color: Color.Red, value: 'Expired' },
                      tooltip: `Expired on ${formatDate(
                        domain.domain?.expires_at,
                      )}`,
                    },
                ].filter(Boolean)
              : [
                  {
                    tag: { color: Color.SecondaryText, value: 'External' },
                    tooltip: 'Registered externally',
                  },
                ]
          }
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
