import { ActionPanel, Color, Icon, List, Action } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';

import Api from './api';
import { Site } from './interfaces';
import { formatDate, getToken, handleNetworkError } from './utils';
import { DeployListView } from './view-deploys';

const api = new Api(getToken());

export default function Command() {
  const [sites, setSites] = useState<Site[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const siteMap = useMemo(() => {
    const map: Record<string, Site[]> = {};
    for (const site of sites) {
      const { account_slug: id } = site;
      if (!map[id]) {
        map[id] = [];
      }
      map[id].push(site);
    }
    return map;
  }, [sites]);

  const teams = useMemo(() => {
    const map: Record<string, string> = {};
    for (const site of sites) {
      const { account_slug: id, account_name: name } = site;
      if (map[id]) {
        continue;
      }
      map[id] = name;
    }
    return map;
  }, [sites]);

  async function fetchSites(query = '') {
    setLoading(true);
    try {
      const sites = await api.getSites(query);
      setSites(sites);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      handleNetworkError(e);
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

  useEffect(() => {
    fetchSites();
    fetchUser();
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      onSearchTextChange={(query) => fetchSites(query)}
      searchBarPlaceholder="Search by site name..."
      throttle
    >
      {Object.keys(siteMap).map((team) => (
        <List.Section key={team} title={teams[team]}>
          {siteMap[team].map((site) => (
            <List.Item
              key={site.id}
              title={site.name}
              accessories={
                favorites.includes(site.id)
                  ? [
                      {
                        icon: { source: Icon.Star, tintColor: Color.Yellow },
                        tooltip: 'Favorite',
                      },
                    ]
                  : undefined
              }
              detail={
                <List.Item.Detail
                  markdown={`![${site.name}](${site.screenshot_url})`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Site ID"
                        text={site.id}
                      />
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
                            ? formatDate(
                                new Date(site.published_deploy?.published_at),
                              )
                            : 'Never'
                        }
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Rocket}
                    title="Show Deploys"
                    target={
                      <DeployListView siteId={site.id} siteName={site.name} />
                    }
                  />
                  <Action.OpenInBrowser
                    title="Open on Netlify"
                    url={site.admin_url}
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
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
