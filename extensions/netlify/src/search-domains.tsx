import {
  ActionPanel,
  Action,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from '@raycast/api';
import { getFavicon, usePromise } from '@raycast/utils';
import { useState } from 'react';

import { OpenOnNetlify } from './components/actions';
import TeamDropdown from './components/team-dropdown';
import api from './utils/api';
import { formatDate, getDomainUrl, handleNetworkError } from './utils/helpers';
import { useTeams } from './utils/hooks';
import { DomainSearch } from './utils/interfaces';
import ManageDNSRecords from './components/dns/manage-dns-records';

export default function Command() {
  const [query, setQuery] = useState<string>('');

  const { isLoadingTeams, teams, teamSlug, setTeamSlug } = useTeams({
    scoped: true,
  });

  const { data: registeredDomains = [], isLoading: isLoadingDomains } =
    usePromise(async (slug: string) => await api.getDomains(slug), [teamSlug]);

  const { data: searchedDomains = [], isLoading: isSearchingDomains } =
    usePromise(
      async (query: string, team: string) =>
        query ? await api.searchDomains(query, team) : [],
      [query, teamSlug],
    );

  const team = teams.find((team) => team.slug === teamSlug);
  const teamName = team?.name;
  const canBuyDomain = team?.user_capabilities?.billing?.c;

  async function confirmBuyDomain(domain: DomainSearch) {
    const options: Alert.Options = {
      icon: Icon.BankNote,
      title: `Register ${domain.name} for $${domain.price}?`,
      message: `Netlify will charge the credit card on file for ${teamName}. This transaction is non-refundable. This domain registration will auto-renew for $${domain.renewal_price} for the second year.`,
      primaryAction: {
        title: 'Register now',
        onAction: async () => {
          try {
            await api.buyDomain(domain.name, teamSlug);
            showToast({
              style: Toast.Style.Success,
              title: `${domain.name} purchased!`,
            });
            setQuery('');
          } catch (e) {
            handleNetworkError(e);
          }
        },
      },
    };
    await confirmAlert(options);
  }

  const teamDropdown = (
    <TeamDropdown
      required
      teamSlug={teamSlug}
      setTeamSlug={setTeamSlug}
      teams={teams}
    />
  );

  return (
    <List
      isLoading={isLoadingTeams || isLoadingDomains || isSearchingDomains}
      filtering
      onSearchTextChange={(text) => setQuery(text.replace(/ /g, ''))}
      searchText={query}
      searchBarAccessory={teams.length > 1 ? teamDropdown : undefined}
      searchBarPlaceholder="Search for a domain name..."
      throttle
    >
      <List.Section title="Registered domains">
        {registeredDomains.map((domain) => (
          <List.Item
            key={domain.name}
            icon={getFavicon(`https://${domain.name}`, {
              fallback: Icon.Globe,
            })}
            title={domain.name}
            subtitle={domain.account_name}
            keywords={domain.account_slug.split('-')}
            accessories={
              domain.domain
                ? ([
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
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ].filter(Boolean) as any[])
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
                <Action.Push
                  title="Manage DNS Records"
                  icon={Icon.Text}
                  target={<ManageDNSRecords domain={domain} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {searchedDomains.length > 0 && (
        <List.Section title="Search results">
          {searchedDomains.map((domain) => (
            <List.Item
              key={domain.delegated_domain || domain.name}
              icon={Icon.Globe}
              title={domain.delegated_domain || domain.name}
              subtitle={
                domain.available
                  ? 'Available'
                  : domain.owned_by_account
                    ? 'Registered by Team'
                    : 'Not Available'
              }
              accessories={
                [
                  domain.available && {
                    tag: { color: Color.Green, value: `$${domain.price}` },
                    tooltip: `$${domain.price} for the first year, $${domain.renewal_price} to renew`,
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ].filter(Boolean) as any[]
              }
              actions={
                domain.available && canBuyDomain ? (
                  <ActionPanel>
                    <Action
                      icon={Icon.BankNote}
                      title="Register Domain"
                      onAction={() => confirmBuyDomain(domain)}
                    />
                  </ActionPanel>
                ) : undefined
              }
            />
          ))}
        </List.Section>
      )}
      <List.EmptyView
        title={`No domains found for ${teamName}`}
        description="Search for a domain name to register it for this team."
      />
    </List>
  );
}
