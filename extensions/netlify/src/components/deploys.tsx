import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { useEffect, useState } from 'react';

import api from '../utils/api';
import { Deploy } from '../utils/interfaces';
import { formatDate, getDeployUrl, handleNetworkError } from '../utils/helpers';
import { getStatusIcon } from '../utils/icons';

interface Props {
  siteId: string;
  siteName: string;
}

export default function DeployListView(props: Props) {
  const [isLoading, setLoading] = useState<boolean>(true);
  const [deploys, setDeploys] = useState<Deploy[]>([]);

  const [query, setQuery] = useState<string>('');
  const [context, setContext] = useState<string>('');

  const { siteId, siteName } = props;

  useEffect(() => {
    async function fetchDeploys() {
      try {
        const deploys = await api.getDeploys(siteId);
        setDeploys(deploys);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    fetchDeploys();
  }, []);

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
        String(deploy.review_id) || '',
        String(deploy.commit_ref) || '',
      ];
      conditions.push(keywords.some((keyword) => keyword.includes(query)));
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
              icon={getStatusIcon(deploy.state)}
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
    metadata={
      <List.Item.Detail.Metadata>
        {deploy.state && (
          <>
            <List.Item.Detail.Metadata.TagList title="Deploy state">
              <List.Item.Detail.Metadata.TagList.Item
                text={deploy.state.toUpperCase()}
                color={getStatusIcon(deploy.state).tintColor}
                // icon={getStatusIcon(deploy.state).icon}
              />
            </List.Item.Detail.Metadata.TagList>
            <List.Item.Detail.Metadata.Separator />
          </>
        )}
        {!deploy.manual_deploy && (
          <>
            {deploy.review_url ? (
              <List.Item.Detail.Metadata.Label
                title="Pull request"
                text={`${deploy.title || deploy.commit_ref || ''} (#${
                  deploy.review_id
                })`}
              />
            ) : (
              deploy.commit_url && (
                <List.Item.Detail.Metadata.Label
                  title="Commit message"
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
            <List.Item.Detail.Metadata.Separator />
          </>
        )}
        {deploy.context && (
          <List.Item.Detail.Metadata.Label
            title="Deploy context"
            text={deploy.context}
          />
        )}
        <List.Item.Detail.Metadata.Label
          title="URL"
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
    <Action.OpenInBrowser
      icon={Icon.AppWindowList}
      title="View Deploy Logs"
      url={getDeployUrl(siteName, deploy.id)}
    />
    <Action.CopyToClipboard
      content={deploy.id}
      shortcut={{ key: 'i', modifiers: ['cmd'] }}
      title="Copy Deploy ID"
    />
    <Action.OpenInBrowser
      icon={Icon.Link}
      shortcut={{ key: 'u', modifiers: ['cmd'] }}
      title="Go to URL"
      url={
        deploy.context === 'production'
          ? deploy.links.permalink
          : deploy.deploy_ssl_url
      }
    />
    {deploy.review_url && (
      <Action.OpenInBrowser
        icon={Icon.CodeBlock}
        shortcut={{ key: 'r', modifiers: ['cmd'] }}
        title="Go to Pull Request"
        url={deploy.review_url}
      />
    )}
  </ActionPanel>
);
