import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { usePromise } from '@raycast/utils';
import { useState } from 'react';

import api from '../utils/api';
import { OpenOnNetlify } from '../components/actions';
import { EnvVar } from '../utils/interfaces';
import { getEnvUrl } from '../utils/helpers';

interface Props {
  siteId: string;
  siteName: string;
}

export default function EnvListView({ siteId, siteName }: Props) {
  const [query, setQuery] = useState<string>('');
  const [context, setContext] = useState<string>('');

  const { data: envs = [], isLoading } = usePromise(
    async (siteId: string) => await api.getEnvVars(siteId),
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

  const filteredEnvs = envs.filter((env) => {
    const conditions = [];
    if (query) {
      const keywords = [env.key || ''];
      conditions.push(
        keywords.some((keyword) =>
          keyword.toLowerCase().includes(query.toLowerCase()),
        ),
      );
    }
    if (context) {
      conditions.push(env.values.some((value) => value.context === context));
    }
    return conditions.every((condition) => !!condition);
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={filteredEnvs.length > 0}
      navigationTitle={`Sites / ${siteName} / Envs`}
      onSearchTextChange={setQuery}
      searchText={query}
      searchBarAccessory={ContextDropdown}
      searchBarPlaceholder="Filter environment variables..."
    >
      {filteredEnvs.length === 0 && (
        <List.EmptyView
          title="No environment variables found"
          description="Try changing your filters."
        />
      )}
      <List.Section title="Environment variables">
        {filteredEnvs.map((env) => (
          <List.Item
            key={env.key}
            icon={env.is_secret ? Icon.Lock : Icon.LockUnlocked}
            title={env.key}
            detail={<EnvMetadata env={env} />}
            actions={<EnvActions env={env} siteName={siteName} />}
          />
        ))}
      </List.Section>
    </List>
  );
}

const EnvMetadata = ({ env }: { env: EnvVar }) => {
  const markdown = `
| Value | Context |
|-------|---------|
${env.values.map((value) => `| ${value.value} | ${value.context} |`).join(`\n`)};
`;
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Scopes">
            {env.scopes.map((scope) => (
              <List.Item.Detail.Metadata.TagList.Item
                key={scope}
                text={scope}
              />
            ))}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
};

const EnvActions = ({ env, siteName }: { env: EnvVar; siteName: string }) => (
  <ActionPanel>
    <Action.CopyToClipboard
      title="Copy 1st Value"
      content={env.values[0].value}
    />
    <OpenOnNetlify url={getEnvUrl(siteName, env.key)} />
  </ActionPanel>
);
