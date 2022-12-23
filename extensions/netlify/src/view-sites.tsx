import { ActionPanel, Color, Icon, List, Action } from '@raycast/api';
import { useEffect, useMemo, useState } from 'react';

import { Deploy, DeployState, Site } from './interfaces';
import Service from './service';
import {
  formatDate,
  getDeployUrl,
  getSiteUrl,
  getToken,
  handleNetworkError,
} from './utils';

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

  useEffect(() => {
    async function fetchSites() {
      try {
        const sites = await service.getSites();
        setSites(sites);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchSites();
  }, []);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search by site name..."
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

interface DeployListProps {
  siteId: string;
  siteName: string;
}

function DeployListView(props: DeployListProps) {
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [isLoading, setLoading] = useState<boolean>(true);

  const { siteId, siteName } = props;

  useEffect(() => {
    async function fetchDeploys() {
      try {
        const deploys = await service.getDeploys(siteId);
        setDeploys(deploys);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchDeploys();
  }, []);

  function getStatusIcon(state: DeployState): {
    source: Icon;
    tintColor: Color;
  } {
    const deployStateMap = {
      retrying: { source: Icon.Circle, tintColor: Color.Yellow },
      new: { source: Icon.Circle, tintColor: Color.Yellow },
      pending_review: { source: Icon.Circle, tintColor: Color.Yellow },
      accepted: { source: Icon.Circle, tintColor: Color.Yellow },
      enqueued: { source: Icon.Circle, tintColor: Color.Yellow },
      building: { source: Icon.CircleProgress25, tintColor: Color.Orange },
      uploading: { source: Icon.CircleProgress50, tintColor: Color.Orange },
      uploaded: { source: Icon.CircleProgress50, tintColor: Color.Orange },
      preparing: { source: Icon.CircleProgress75, tintColor: Color.Orange },
      prepared: { source: Icon.CircleProgress75, tintColor: Color.Orange },
      processing: { source: Icon.CircleProgress100, tintColor: Color.Orange },
      error: { source: Icon.XMarkCircle, tintColor: Color.Red },
      rejected: { source: Icon.XMarkCircle, tintColor: Color.Red },
      deleted: { source: Icon.CheckCircle, tintColor: Color.Red },
      skipped: { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
      cancelled: { source: Icon.MinusCircle, tintColor: Color.SecondaryText },
      ready: { source: Icon.CheckCircle, tintColor: Color.Green },
    };
    return (
      deployStateMap[state] || { source: Icon.Circle, tintColor: Color.Green }
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`Deploys: ${siteName}`}
      searchBarPlaceholder="Filter recent deploys by id, title, author, number, branch, sha..."
    >
      {deploys.map((deploy) => (
        <List.Item
          key={deploy.id}
          icon={getStatusIcon(deploy.state)}
          title={deploy.title || deploy.commit_ref || deploy.id}
          keywords={[
            deploy.id,
            deploy.branch,
            deploy.committer || '',
            String(deploy.review_id),
            String(deploy.commit_ref),
          ]}
          detail={
            <List.Item.Detail
              // markdown={`![${site.name}](${site.screenshot_url})`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title={
                      deploy.review_url
                        ? 'Pull request title'
                        : 'Commit message'
                    }
                    text={deploy.title || deploy.commit_ref || deploy.id}
                  />
                  {deploy.review_url ? (
                    <List.Item.Detail.Metadata.Label
                      title="Pull request URL"
                      text={deploy.review_url}
                    />
                  ) : (
                    <List.Item.Detail.Metadata.Label
                      title="Commit URL"
                      text={deploy.commit_url}
                    />
                  )}
                  {deploy.committer && (
                    <List.Item.Detail.Metadata.Label
                      title="Author"
                      text={deploy.committer}
                    />
                  )}
                  {deploy.commit_ref && (
                    <List.Item.Detail.Metadata.Label
                      title="Git ref"
                      text={`${deploy.branch}@${deploy.commit_ref.substr(
                        0,
                        7,
                      )}`}
                    />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Deploy state">
                    <List.Item.Detail.Metadata.TagList.Item
                      text={deploy.state.toUpperCase()}
                      color={getStatusIcon(deploy.state).tintColor}
                      // icon={getStatusIcon(deploy.state).icon}
                    />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Deploy ID"
                    text={deploy.id}
                  />
                  {deploy.deploy_ssl_url && (
                    <List.Item.Detail.Metadata.Label
                      title={
                        deploy.context === 'production'
                          ? 'URL'
                          : 'Deploy Preview'
                      }
                      text={deploy.deploy_ssl_url}
                    />
                  )}
                  {deploy.links.branch && (
                    <List.Item.Detail.Metadata.Label
                      title="Branch deploy"
                      text={deploy.links.branch}
                    />
                  )}
                  {deploy.links.permalink && (
                    <List.Item.Detail.Metadata.Label
                      title="Permalink"
                      text={deploy.links.permalink}
                    />
                  )}
                  {deploy.deploy_time && (
                    <List.Item.Detail.Metadata.Label
                      title="Deploy time"
                      text={`${deploy.deploy_time} seconds`}
                    />
                  )}
                  <List.Item.Detail.Metadata.Label
                    title="Created at"
                    text={formatDate(new Date(deploy.created_at))}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open on Netlify"
                url={getDeployUrl(siteName, deploy.id)}
              />
            </ActionPanel>
          }
        />
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
