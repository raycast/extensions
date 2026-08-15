import { ActionPanel, Color, Icon, List, Action } from '@raycast/api';
import { getFavicon, useCachedPromise, usePromise } from '@raycast/utils';
import { useState } from 'react';

import api from './utils/api';
import { formatDate, handleNetworkError } from './utils/helpers';
import { useTeams } from './utils/hooks';
import { getFramework, getGitProviderIcon } from './utils/icons';
import { Site } from './utils/interfaces';

import { OpenOnNetlify, OpenRepo } from './components/actions';
import DeployListView from './components/deploys';
import TeamDropdown from './components/team-dropdown';
import EnvListView from './components/envs';

export default function Command() {
  const [query, setQuery] = useState<string>('');

  const { isLoadingTeams, teams, teamSlug, setTeamSlug } = useTeams({
    scoped: false,
  });

  const {
    data: sites = [],
    isLoading: isLoadingSites,
    pagination,
  } = useCachedPromise(
    (query: string, team: string) =>
      async ({ page }) =>
        await api.getSites(query, team, page + 1),
    [query, teamSlug],
  );

  const { data: favorites = [], mutate: mutateFavorites } =
    usePromise(async () => {
      const user = await api.getUser();
      return user.favorite_sites;
    }, []);

  async function toggleFavorite(siteId: string) {
    const ids = favorites.includes(siteId)
      ? favorites.filter((id) => id !== siteId)
      : favorites.concat(siteId);

    try {
      await mutateFavorites(api.saveFavorites(ids), {
        optimisticUpdate() {
          return ids;
        },
      });
    } catch (e) {
      handleNetworkError(e);
    }
  }

  const teamDropdown = (
    <TeamDropdown teamSlug={teamSlug} setTeamSlug={setTeamSlug} teams={teams} />
  );

  return (
    <List
      isLoading={isLoadingTeams || isLoadingSites}
      isShowingDetail
      onSearchTextChange={setQuery}
      searchText={query}
      searchBarAccessory={teams.length > 1 ? teamDropdown : undefined}
      searchBarPlaceholder="Search by site name..."
      throttle
      pagination={pagination}
    >
      <List.Section title="Search results">
        {sites.map((site) => (
          <List.Item
            key={site.id}
            icon={getFavicon(site.ssl_url, { fallback: Icon.Link })}
            title={site.name}
            subtitle={site.account_name}
            accessories={
              [
                favorites.includes(site.id) && {
                  icon: { source: Icon.Star, tintColor: Color.Yellow },
                  tooltip: 'Favorite (⌘F)',
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ].filter(Boolean) as any[]
            }
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
          <List.Item.Detail.Metadata.Link
            title="Production URL"
            target={site.ssl_url}
            text={site.ssl_url}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Repository"
            icon={{
              source: gitProvider?.source || '',
              tintColor: gitProvider?.tintColor,
            }}
            text={site.build_settings.repo_path || 'Not linked'}
          />
          <List.Item.Detail.Metadata.Separator />
          {framework.slug !== 'unknown' && (
            <>
              <List.Item.Detail.Metadata.Label
                title="Framework"
                icon={{
                  source: framework.source,
                  tintColor: framework.tintColor,
                }}
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
    <ActionPanel.Section>
      <Action.Push
        icon={Icon.Rocket}
        title="Show Deploys"
        target={<DeployListView siteId={site.id} siteName={site.name} />}
      />
      <Action.Push
        icon={Icon.MagnifyingGlass}
        title="Show Environment Variables"
        target={<EnvListView siteId={site.id} siteName={site.name} />}
      />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <OpenOnNetlify url={site.admin_url} />
      {site.build_settings.repo_url && (
        <OpenRepo url={site.build_settings.repo_url} />
      )}
      <Action.OpenInBrowser
        icon={Icon.Globe}
        shortcut={{ key: 'u', modifiers: ['cmd'] }}
        title="Open Production URL"
        url={site.ssl_url}
      />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <Action
        icon={favorites.includes(site.id) ? Icon.StarDisabled : Icon.Star}
        shortcut={{ key: 'f', modifiers: ['cmd'] }}
        title={favorites.includes(site.id) ? 'Remove Favorite' : 'Add Favorite'}
        onAction={() => toggleFavorite(site.id)}
      />
      <Action.CopyToClipboard
        content={site.id}
        shortcut={{ key: '.', modifiers: ['cmd'] }}
        title="Copy Site ID"
      />
    </ActionPanel.Section>
  </ActionPanel>
);
