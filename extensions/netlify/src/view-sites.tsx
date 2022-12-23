import { ActionPanel, Icon, List, Action } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';

import { Site } from './interfaces';
import Service from './service';
import { formatDate, getSiteUrl, getToken, handleNetworkError } from './utils';
import { DeployListView } from './view-deploys';

const service = new Service(getToken());

export default function Command() {
  const [sites, setSites] = useState<Site[]>([]);
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
      const sites = await service.getSites(query);
      setSites(sites);
      setLoading(false);
    } catch (e) {
      setLoading(false);
      handleNetworkError(e);
    }
  }

  useEffect(() => {
    fetchSites();
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
              // accessories={[
              //   {
              //     icon: { source: Icon.Star, tintColor: Color.Yellow },
              //     tooltip: 'Favorite',
              //   },
              // ]}
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
                        title="Repo URL"
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
                    icon={Icon.Hammer}
                    title="Show Deploys"
                    target={
                      <DeployListView siteId={site.id} siteName={site.name} />
                    }
                  />
                  <Action.Push
                    icon={Icon.Text}
                    title="Show Environment Variables"
                    target={
                      <EnvVariableView
                        value={site.build_settings.env}
                        siteName={site.name}
                      />
                    }
                  />
                  <Action.OpenInBrowser
                    title="Open on Netlify"
                    url={getSiteUrl(site.name)}
                    shortcut={{ key: 'n', modifiers: ['cmd'] }}
                  />
                  <Action.OpenInBrowser
                    title="Open Site"
                    url={site.ssl_url}
                    shortcut={{ key: 's', modifiers: ['cmd'] }}
                  />
                  <Action.OpenInBrowser
                    title="Open Repository"
                    url={site.build_settings.repo_url}
                    shortcut={{ key: 'g', modifiers: ['cmd'] }}
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

interface EnvVariableProps {
  siteName: string;
  value: Record<string, string>;
}

function EnvVariableView(props: EnvVariableProps) {
  const { value, siteName } = props;

  return (
    <List navigationTitle={`Variables: ${siteName}`}>
      {Object.entries(value).map(([key, value]) => (
        <List.Item
          key={key}
          title={key}
          subtitle={value}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={`${key}=${value}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
