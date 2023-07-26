import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { usePromise } from '@raycast/utils';
import { useState } from 'react';

import api from '../utils/api';
import { OpenRepo } from '../components/actions';
import { formatDate, getDeployUrl, getStatusText } from '../utils/helpers';
import { getStatusIcon } from '../utils/icons';
import { Deploy } from '../utils/interfaces';

interface Props {
  siteId: string;
  siteName: string;
}

export default function DeployListView({ siteId, siteName }: Props) {
  const [query, setQuery] = useState<string>('');
  const [context, setContext] = useState<string>('');

  const { data: deploys = [], isLoading } = usePromise(
    async (siteId: string) => await api.getDeploys(siteId),
    [siteId],
  );

  const ContextDropdown = (
    <List.Dropdown
      onChange={setContext}
      storeValue
      tooltip="Fliter by deploy context"
    >
      <List.Dropdown.Item title="Any deploy context" value="" />
      <List.Dropdown.Section>
        <List.Dropdown.Item title="Production Deploys" value="production" />
        <List.Dropdown.Item title="Deploy Previews" value="deploy-preview" />
        <List.Dropdown.Item title="Branch Deploys" value="branch-deploy" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  const filteredDeploys = deploys.filter((deploy) => {
    const conditions = [];
    if (query) {
      const keywords = [
        deploy.title || '',
        deploy.id || '',
        deploy.branch || '',
        deploy.committer || '',
        deploy.error_message || '',
        deploy.state || '',
        String(deploy.review_id) || '',
        String(deploy.commit_ref) || '',
      ];
      conditions.push(
        keywords.some((keyword) =>
          keyword.toLowerCase().includes(query.toLowerCase()),
        ),
      );
    }
    if (context) {
      conditions.push(deploy.context === context);
    }
    return conditions.every((condition) => !!condition);
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={filteredDeploys.length > 0}
      navigationTitle={`Sites / ${siteName} / Deploys`}
      onSearchTextChange={setQuery}
      searchText={query}
      searchBarAccessory={ContextDropdown}
      searchBarPlaceholder="Filter recent deploys..."
    >
      {filteredDeploys.length === 0 && (
        <List.EmptyView
          title="No deploys found"
          description="Try changing your filters."
        />
      )}
      <List.Section title="Recent deploys">
        {filteredDeploys
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
          .map((deploy) => (
            <List.Item
              key={deploy.id}
              icon={getStatusIcon(deploy.state, deploy.error_message)}
              title={deploy.title || deploy.commit_ref || deploy.id}
              detail={<DeployMetadata deploy={deploy} />}
              actions={<DeployActions deploy={deploy} siteName={siteName} />}
            />
          ))}
      </List.Section>
    </List>
  );
}

const DeployMetadata = ({ deploy }: { deploy: Deploy }) => (
  <List.Item.Detail
    markdown={
      deploy.error_message
        ? `\`\`\`\n${deploy.error_message}\n\`\`\``
        : undefined
    }
    metadata={
      <List.Item.Detail.Metadata>
        {deploy.state && (
          <>
            <List.Item.Detail.Metadata.TagList title="Deploy state">
              <List.Item.Detail.Metadata.TagList.Item
                text={getStatusText(deploy.state, deploy.error_message)}
                color={
                  getStatusIcon(deploy.state, deploy.error_message).tintColor
                }
              />
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.Separator />
          </>
        )}
        {!deploy.manual_deploy && (
          <>
            {deploy.review_url ? (
              <List.Item.Detail.Metadata.Link
                title="Pull request"
                target={deploy.review_url}
                text={`${deploy.title || deploy.commit_ref || ''} (#${
                  deploy.review_id
                })`}
              />
            ) : (
              deploy.commit_url && (
                <List.Item.Detail.Metadata.Link
                  title="Commit message"
                  target={deploy.commit_url}
                  text={deploy.title || deploy.commit_ref || ''}
                />
              )
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
                text={`${deploy.branch}@${deploy.commit_ref.substr(0, 7)}`}
              />
            )}
            {(deploy.review_url ||
              deploy.commit_url ||
              deploy.committer ||
              deploy.commit_ref) && <List.Item.Detail.Metadata.Separator />}
          </>
        )}
        {deploy.context && (
          <List.Item.Detail.Metadata.Label
            title="Deploy context"
            text={deploy.context}
          />
        )}
        <List.Item.Detail.Metadata.Link
          title="URL"
          target={
            deploy.context === 'deploy-preview'
              ? deploy.deploy_ssl_url
              : deploy.links.permalink
          }
          text={
            deploy.context === 'deploy-preview'
              ? deploy.deploy_ssl_url
              : deploy.links.permalink
          }
        />
        <List.Item.Detail.Metadata.Label
          title="Deployed at"
          text={formatDate(deploy.created_at)}
        />
        {deploy.deploy_time && (
          <List.Item.Detail.Metadata.Label
            title="Deploy duration"
            text={`${deploy.deploy_time} seconds`}
          />
        )}
      </List.Item.Detail.Metadata>
    }
  />
);

const DeployActions = ({
  deploy,
  siteName,
}: {
  deploy: Deploy;
  siteName: string;
}) => (
  <ActionPanel>
    <ActionPanel.Section>
      <Action.OpenInBrowser
        icon={{
          source: { light: 'netlify-icon.svg', dark: 'netlify-icon@dark.svg' },
        }}
        title="View Deploy Logs"
        url={getDeployUrl(siteName, deploy.id)}
      />
      {deploy.review_url && <OpenRepo url={deploy.review_url} />}
      <Action.OpenInBrowser
        icon={Icon.Globe}
        shortcut={{ key: 'u', modifiers: ['cmd'] }}
        title="Open URL"
        url={
          deploy.context === 'production'
            ? deploy.links.permalink
            : deploy.deploy_ssl_url
        }
      />
    </ActionPanel.Section>
    <ActionPanel.Section>
      <Action.CopyToClipboard
        content={deploy.id}
        shortcut={{ key: '.', modifiers: ['cmd'] }}
        title="Copy Deploy ID"
      />
    </ActionPanel.Section>
  </ActionPanel>
);
