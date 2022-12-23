import { ActionPanel, List, Action } from '@raycast/api';
import { useEffect, useState } from 'react';

import Api from './api';
import { Deploy } from './interfaces';
import {
  formatDate,
  getDeployUrl,
  getStatusIcon,
  getToken,
  handleNetworkError,
} from './utils';

const service = new Api(getToken());

interface Props {
  siteId: string;
  siteName: string;
}

export function DeployListView(props: Props) {
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
                title="View Deploy Logs"
                url={getDeployUrl(siteName, deploy.id)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
