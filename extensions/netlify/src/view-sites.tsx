import { ActionPanel, Color, Icon, List, Action } from '@raycast/api';
import { useEffect, useState } from 'react';

import Api from './api';
import { Site, Team } from './interfaces';
import { formatDate, getToken, handleNetworkError } from './utils';
import { DeployListView } from './view-deploys';

const STAR_ICON = [
  {
    icon: { source: Icon.Star, tintColor: Color.Yellow },
    tooltip: 'Favorite',
  },
];

const api = new Api(getToken());

export default function Command() {
  const [sites, setSites] = useState<Site[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [query, setQuery] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  async function fetchSites(query = '', team?: string) {
    setLoading(true);
    try {
      const sites = await api.getSites(query, team);
      setSites(sites);
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

  async function fetchUser() {
    try {
      const user = await api.getUser();
      setFavorites(user.favorite_sites);
    } catch (e) {
      // ignore silently
    }
  }

  async function toggleFavorite(siteId: string) {
    setLoading(true);
    const ids = favorites.includes(siteId)
      ? favorites.filter((id) => id !== siteId)
      : favorites.concat(siteId);
    try {
      const user = await api.saveFavorites(ids);
      setFavorites(user.favorite_sites);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      handleNetworkError(e);
    }
  }

  useEffect(() => {
    fetchSites();
    fetchTeams();
    fetchUser();
  }, []);

  useEffect(() => {
    fetchSites(query, teamFilter);
  }, [query, teamFilter]);

  const TeamDropdown = (
    <List.Dropdown
      onChange={setTeamFilter}
      placeholder="Filter teams"
      storeValue
      tooltip="Scope search to selected team"
    >
      <List.Dropdown.Item title="Search across all teams" value="" />
      <List.Dropdown.Section>
        {teams
          .sort((a, b) =>
            a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1,
          )
          .map((team) => (
            <List.Dropdown.Item
              key={team.slug}
              icon={{
                source: team.team_logo_url ? team.team_logo_url : 'icon.png',
              }}
              title={team.name}
              value={team.slug}
            />
          ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setQuery}
      searchText={query}
      searchBarAccessory={teams.length > 1 ? TeamDropdown : undefined}
      searchBarPlaceholder="Search by site name..."
      throttle
    >
      {sites.map((site) => (
        <List.Item
          key={site.id}
          title={site.name}
          subtitle={site.account_name}
          accessories={favorites.includes(site.id) ? STAR_ICON : undefined}
          detail={<SiteMetadata site={site} />}
          actions={
            <SiteActions
              favorites={favorites}
              site={site}
              toggleFavorite={toggleFavorite}
            />
          }
        />
      ))}
    </List>
  );
}

const SiteMetadata = ({ site }: { site: Site }) => (
  <List.Item.Detail
    markdown={`![${site.name}](${site.screenshot_url})`}
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Site ID" text={site.id} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label
          title="Repository"
          text={site.build_settings.repo_url || 'N/A'}
        />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label
          title="Production URL"
          text={site.ssl_url}
        />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label
          title="Last published"
          text={
            site.published_deploy?.published_at
              ? formatDate(new Date(site.published_deploy?.published_at))
              : 'Never'
          }
        />
      </List.Item.Detail.Metadata>
    }
  />
);

const SiteActions = ({
  favorites,
  site,
  toggleFavorite,
}: {
  favorites: string[];
  site: Site;
  toggleFavorite: (siteId: string) => void;
}) => (
  <ActionPanel>
    <Action.Push
      icon={Icon.Rocket}
      title="Show Deploys"
      target={<DeployListView siteId={site.id} siteName={site.name} />}
    />
    <Action.OpenInBrowser title="Open on Netlify" url={site.admin_url} />
    <Action
      icon={favorites.includes(site.id) ? Icon.StarDisabled : Icon.Star}
      shortcut={{ key: 'f', modifiers: ['cmd'] }}
      title={favorites.includes(site.id) ? 'Remove Favorite' : 'Add Favorite'}
      onAction={() => toggleFavorite(site.id)}
    />
    <Action.CopyToClipboard
      content={site.id}
      shortcut={{ key: 'i', modifiers: ['cmd'] }}
      title="Copy Site ID"
    />
    {site.build_settings.repo_url && (
      <Action.OpenInBrowser
        icon={Icon.CodeBlock}
        shortcut={{ key: 'r', modifiers: ['cmd'] }}
        title="Go to Repository"
        url={site.build_settings.repo_url}
      />
    )}
    <Action.OpenInBrowser
      icon={Icon.Link}
      shortcut={{ key: 'p', modifiers: ['cmd'] }}
      title="Go to Production URL"
      url={site.ssl_url}
    />
    <Action.OpenInBrowser
      icon={Icon.Gear}
      shortcut={{ key: 's', modifiers: ['cmd'] }}
      title="Go to Site Settings"
      url={`${site.admin_url}/settings`}
    />
  </ActionPanel>
);
