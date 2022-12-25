import { ActionPanel, Color, Icon, List, Action } from '@raycast/api';
import { useCachedState } from '@raycast/utils';
import { useEffect, useState } from 'react';

import api from './utils/api';
import { formatDate, handleNetworkError } from './utils/helpers';
import { Site, Team } from './utils/interfaces';
import { getFramework, getGitProviderIcon } from './utils/icons';

import DeployListView from './components/deploys';
import TeamDropdown from './components/team-dropdown';

export default function Command() {
  const [isLoading, setLoading] = useState<boolean>(true);

  const [sites, setSites] = useState<Site[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  const [query, setQuery] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useCachedState<string>(
    'selectedTeam',
    '',
  );

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
    fetchTeams();
    fetchUser();
  }, []);

  useEffect(() => {
    fetchSites(query, selectedTeam);
  }, [query, selectedTeam]);

  const teamDropdown = (
    <TeamDropdown
      selectedTeam={selectedTeam}
      setSelectedTeam={setSelectedTeam}
      teams={teams}
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={setQuery}
      searchText={query}
      searchBarAccessory={teams.length > 1 ? teamDropdown : undefined}
      searchBarPlaceholder="Search by site name..."
      throttle
    >
      <List.Section title="Search results">
        {sites.map((site) => (
          <List.Item
            key={site.id}
            title={site.name}
            subtitle={site.account_name}
            // @ts-expect-error due to .filter(Boolean)
            accessories={[
              favorites.includes(site.id) && {
                icon: { source: Icon.Star, tintColor: Color.Yellow },
                tooltip: 'Favorite (⌘F)',
              },
            ].filter(Boolean)}
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
      </List.Section>
    </List>
  );
}

const SiteMetadata = ({ site }: { site: Site }) => {
  const framework = getFramework(site.published_deploy?.framework);
  const gitProvider = getGitProviderIcon(site.build_settings.provider);
  const publishedAt = site.published_deploy?.published_at;
  return (
    <List.Item.Detail
      markdown={`![${site.name}](${site.screenshot_url})`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Production URL"
            text={site.ssl_url}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Repository"
            icon={gitProvider}
            text={site.build_settings.repo_path || 'Not linked'}
          />
          <List.Item.Detail.Metadata.Separator />
          {framework.slug !== 'unknown' && (
            <>
              <List.Item.Detail.Metadata.Label
                title="Framework"
                icon={framework}
                text={framework.name}
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          <List.Item.Detail.Metadata.Label
            title="Last published"
            text={publishedAt ? formatDate(publishedAt) : 'Never'}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
};

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
    <Action.OpenInBrowser
      icon={Icon.Link}
      shortcut={{ key: 'u', modifiers: ['cmd'] }}
      title="Go to Production URL"
      url={site.ssl_url}
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
      icon={Icon.Gear}
      shortcut={{ key: 's', modifiers: ['cmd'] }}
      title="Go to Site Settings"
      url={`${site.admin_url}/settings`}
    />
  </ActionPanel>
);
