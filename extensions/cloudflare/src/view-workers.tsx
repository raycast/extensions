import { Action, ActionPanel, Color, Detail, Icon, List } from '@raycast/api';
import { useState } from 'react';

import {
  Worker,
  WorkerDeployment,
  WorkerVersion,
  WorkerVersionDetail,
} from './service';
import { getWorkerUrl, handleNetworkError } from './utils';
import { useCachedPromise } from '@raycast/utils';
import { getCloudflareService, withCloudflareAccessToken } from './oauth';

type SortOption =
  | 'modified-desc'
  | 'modified-asc'
  | 'created-desc'
  | 'created-asc'
  | 'name-asc'
  | 'name-desc';

const sortOptions: { value: SortOption; title: string }[] = [
  { value: 'modified-desc', title: 'Modified (Newest)' },
  { value: 'modified-asc', title: 'Modified (Oldest)' },
  { value: 'created-desc', title: 'Created (Newest)' },
  { value: 'created-asc', title: 'Created (Oldest)' },
  { value: 'name-asc', title: 'Name (A-Z)' },
  { value: 'name-desc', title: 'Name (Z-A)' },
];

function sortWorkers(workers: Worker[], sortBy: SortOption): Worker[] {
  return [...workers].sort((a, b) => {
    switch (sortBy) {
      case 'modified-desc':
        return (
          new Date(b.modifiedOn).getTime() - new Date(a.modifiedOn).getTime()
        );
      case 'modified-asc':
        return (
          new Date(a.modifiedOn).getTime() - new Date(b.modifiedOn).getTime()
        );
      case 'created-desc':
        return (
          new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime()
        );
      case 'created-asc':
        return (
          new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime()
        );
      case 'name-asc':
        return a.id.localeCompare(b.id);
      case 'name-desc':
        return b.id.localeCompare(a.id);
    }
  });
}

function Command() {
  const [sortBy, setSortBy] = useState<SortOption>('modified-desc');

  const {
    isLoading,
    data: { accounts, workers },
  } = useCachedPromise(
    async () => {
      const accounts = await getCloudflareService().listAccounts();
      const workers: Record<string, Worker[]> = {};
      const workerRequests = accounts.map(async (account) => {
        const accountWorkers = await getCloudflareService().listWorkers(
          account.id,
        );
        workers[account.id] = accountWorkers;
      });
      await Promise.all(workerRequests);
      return {
        accounts,
        workers,
      };
    },
    [],
    {
      initialData: {
        accounts: [],
        workers: {},
      },
      onError: handleNetworkError,
    },
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort By"
          value={sortBy}
          onChange={(value) => setSortBy(value as SortOption)}
        >
          {sortOptions.map((option) => (
            <List.Dropdown.Item
              key={option.value}
              title={option.title}
              value={option.value}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && !Object.keys(workers).length && (
        <List.EmptyView
          icon={Icon.Code}
          title="No Workers found"
          description="Create a Worker to run serverless code on Cloudflare's edge network."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://dash.cloudflare.com/?to=/:account/workers-and-pages/create" />
            </ActionPanel>
          }
        />
      )}
      {Object.entries(workers)
        .filter((entry) => entry[1].length > 0)
        .map((entry) => {
          const [accountId, unsortedWorkers] = entry;
          const accountWorkers = sortWorkers(unsortedWorkers, sortBy);
          const account = accounts.find((account) => account.id === accountId);
          const name = account?.name || '';
          return (
            <List.Section title={name} key={accountId}>
              {accountWorkers.map((worker) => (
                <List.Item
                  key={worker.id}
                  title={worker.id}
                  accessories={[
                    {
                      date: new Date(worker.modifiedOn),
                      tooltip: `Modified: ${new Date(worker.modifiedOn).toLocaleString()}`,
                    },
                  ]}
                  detail={<WorkerDetail worker={worker} />}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.Push
                          icon={Icon.Clock}
                          title="Show Versions"
                          target={
                            <WorkerVersionsView
                              accountId={accountId}
                              workerName={worker.id}
                            />
                          }
                        />
                        <Action.Push
                          icon={Icon.Upload}
                          title="Show Deployments"
                          target={
                            <WorkerDeploymentsView
                              accountId={accountId}
                              workerName={worker.id}
                            />
                          }
                        />
                        <Action.OpenInBrowser
                          title="Open on Cloudflare"
                          url={getWorkerUrl(accountId, worker.id)}
                          shortcut={{ modifiers: ['cmd'], key: 'o' }}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.CopyToClipboard
                          icon={Icon.CopyClipboard}
                          content={worker.id}
                          title="Copy Worker Name"
                          shortcut={{ modifiers: ['cmd'], key: '.' }}
                        />
                        <Action.CopyToClipboard
                          icon={Icon.CopyClipboard}
                          content={getWorkerUrl(accountId, worker.id)}
                          title="Copy Cloudflare URL"
                          shortcut={{ modifiers: ['cmd', 'shift'], key: '.' }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}

interface WorkerHistoryProps {
  accountId: string;
  workerName: string;
}

export function WorkerDeploymentsView({
  accountId,
  workerName,
}: WorkerHistoryProps) {
  const { isLoading, data: deployments = [] } = useCachedPromise(
    async () =>
      getCloudflareService().listWorkerDeployments(accountId, workerName),
    [],
    { onError: handleNetworkError },
  );

  return (
    <List isLoading={isLoading} isShowingDetail>
      {!isLoading && deployments.length === 0 && (
        <List.EmptyView
          icon={Icon.Upload}
          title="No Worker Deployments"
          description="Cloudflare did not return deployments for this Worker."
        />
      )}
      {deployments.map((deployment) => (
        <WorkerDeploymentItem key={deployment.id} deployment={deployment} />
      ))}
    </List>
  );
}

function WorkerDeploymentItem({
  deployment,
}: {
  deployment: WorkerDeployment;
}) {
  const versions = deployment.versions
    .map(
      (version) => `${version.versionId.slice(0, 8)} (${version.percentage}%)`,
    )
    .join(', ');

  return (
    <List.Item
      icon={Icon.Upload}
      title={deployment.message || `Deployment ${deployment.id.slice(0, 8)}`}
      subtitle={deployment.source}
      accessories={[
        {
          date: new Date(deployment.createdOn),
          tooltip: new Date(deployment.createdOn).toLocaleString(),
        },
      ]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Deployment ID"
                text={deployment.id}
              />
              <List.Item.Detail.Metadata.Label
                title="Created"
                text={new Date(deployment.createdOn).toLocaleString()}
              />
              <List.Item.Detail.Metadata.Label
                title="Source"
                text={deployment.source || 'Unknown'}
              />
              <List.Item.Detail.Metadata.Label
                title="Author"
                text={deployment.authorEmail || 'Unknown'}
              />
              <List.Item.Detail.Metadata.Label
                title="Versions"
                text={versions || 'Unknown'}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Deployment ID"
            content={deployment.id}
          />
          {deployment.versions[0] && (
            <Action.CopyToClipboard
              title="Copy Active Version ID"
              content={deployment.versions[0].versionId}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

export function WorkerVersionsView({
  accountId,
  workerName,
}: WorkerHistoryProps) {
  const { isLoading, data: versions = [] } = useCachedPromise(
    async () =>
      getCloudflareService().listWorkerVersions(accountId, workerName),
    [],
    { onError: handleNetworkError },
  );

  return (
    <List isLoading={isLoading} isShowingDetail>
      {!isLoading && versions.length === 0 && (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Worker Versions"
          description="Cloudflare did not return versions for this Worker."
        />
      )}
      {versions.map((version, index) => (
        <WorkerVersionItem
          key={version.id}
          accountId={accountId}
          workerName={workerName}
          version={version}
          previousVersion={versions[index + 1]}
        />
      ))}
    </List>
  );
}

function WorkerVersionItem({
  accountId,
  workerName,
  version,
  previousVersion,
}: WorkerHistoryProps & {
  version: WorkerVersion;
  previousVersion?: WorkerVersion;
}) {
  const timestamp = version.modifiedOn || version.createdOn;

  return (
    <List.Item
      icon={Icon.Clock}
      title={version.number ? `Version ${version.number}` : version.id}
      subtitle={version.source}
      accessories={
        timestamp
          ? [
              {
                date: new Date(timestamp),
                tooltip: new Date(timestamp).toLocaleString(),
              },
            ]
          : undefined
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Version ID"
                text={version.id}
              />
              <List.Item.Detail.Metadata.Label
                title="Version Number"
                text={version.number?.toString() || 'Unknown'}
              />
              <List.Item.Detail.Metadata.Label
                title="Source"
                text={version.source || 'Unknown'}
              />
              <List.Item.Detail.Metadata.Label
                title="Author"
                text={version.authorEmail || 'Unknown'}
              />
              <List.Item.Detail.Metadata.Label
                title="Created"
                text={formatOptionalDate(version.createdOn)}
              />
              <List.Item.Detail.Metadata.Label
                title="Modified"
                text={formatOptionalDate(version.modifiedOn)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.MagnifyingGlass}
            title="Inspect Version"
            target={
              <WorkerVersionDetailView
                accountId={accountId}
                workerName={workerName}
                versionId={version.id}
              />
            }
          />
          {previousVersion && (
            <Action.Push
              icon={Icon.TwoArrowsClockwise}
              title="Compare with Previous Version"
              target={
                <WorkerVersionComparisonView
                  accountId={accountId}
                  workerName={workerName}
                  current={version}
                  previous={previousVersion}
                />
              }
            />
          )}
          <Action.CopyToClipboard
            title="Copy Version ID"
            content={version.id}
          />
        </ActionPanel>
      }
    />
  );
}

function WorkerVersionDetailView({
  accountId,
  workerName,
  versionId,
}: WorkerHistoryProps & { versionId: string }) {
  const { isLoading, data: version } = useCachedPromise(
    async () =>
      getCloudflareService().getWorkerVersionDetail(
        accountId,
        workerName,
        versionId,
      ),
    [],
    { onError: handleNetworkError },
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={version ? formatWorkerVersionMarkdown(workerName, version) : ''}
      actions={
        version ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Version ID"
              content={version.id}
            />
            <Action.CopyToClipboard
              title="Copy Version Summary"
              content={formatWorkerVersionMarkdown(workerName, version)}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function WorkerVersionComparisonView({
  accountId,
  workerName,
  current,
  previous,
}: WorkerHistoryProps & { current: WorkerVersion; previous: WorkerVersion }) {
  const { isLoading, data } = useCachedPromise(
    async () => {
      const [currentDetail, previousDetail] = await Promise.all([
        getCloudflareService().getWorkerVersionDetail(
          accountId,
          workerName,
          current.id,
        ),
        getCloudflareService().getWorkerVersionDetail(
          accountId,
          workerName,
          previous.id,
        ),
      ]);
      return { current: currentDetail, previous: previousDetail };
    },
    [],
    { onError: handleNetworkError },
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        data
          ? formatWorkerVersionComparison(
              workerName,
              data.current,
              data.previous,
            )
          : ''
      }
    />
  );
}

function formatWorkerVersionMarkdown(
  workerName: string,
  version: WorkerVersionDetail,
): string {
  const bindings = version.bindings.length
    ? version.bindings
        .map(
          (binding) =>
            `- **${binding.name}** — ${binding.type}${binding.resource ? ` (${binding.resource})` : ''}`,
        )
        .join('\n')
    : '_No bindings returned._';
  const exports = version.exports.length
    ? version.exports
        .map(
          (entry) =>
            `- **${entry.name}** — ${entry.type}${entry.state ? ` (${entry.state})` : ''}`,
        )
        .join('\n')
    : '_No declarative exports returned._';
  const handlers = [
    ...version.handlers,
    ...version.namedHandlers.flatMap((entry) =>
      entry.handlers.map((handler) => `${entry.name}.${handler}`),
    ),
  ];

  return `# ${workerName} — Version ${version.number ?? version.id.slice(0, 8)}

- **Version ID:** ${version.id}
- **Created:** ${formatOptionalDate(version.createdOn)}
- **Source:** ${version.source || 'Unknown'}
- **Last deployed from:** ${version.lastDeployedFrom || 'Unknown'}
- **Compatibility date:** ${version.compatibilityDate || 'None'}
- **Compatibility flags:** ${version.compatibilityFlags.join(', ') || 'None'}
- **CPU limit:** ${version.cpuLimitMs ? `${version.cpuLimitMs} ms` : 'Default'}
- **Usage model:** ${version.usageModel || 'Default'}
- **Handlers:** ${handlers.join(', ') || 'None'}

## Bindings

${bindings}

## Exports

${exports}`;
}

function formatWorkerVersionComparison(
  workerName: string,
  current: WorkerVersionDetail,
  previous: WorkerVersionDetail,
): string {
  const bindingDiff = compareNamedValues(
    current.bindings.map(
      (binding) => `${binding.name}:${binding.type}:${binding.resource || ''}`,
    ),
    previous.bindings.map(
      (binding) => `${binding.name}:${binding.type}:${binding.resource || ''}`,
    ),
  );
  const exportDiff = compareNamedValues(
    current.exports.map(
      (entry) => `${entry.name}:${entry.type}:${entry.state || ''}`,
    ),
    previous.exports.map(
      (entry) => `${entry.name}:${entry.type}:${entry.state || ''}`,
    ),
  );
  const flagDiff = compareNamedValues(
    current.compatibilityFlags,
    previous.compatibilityFlags,
  );

  return `# ${workerName} Version Comparison

Comparing **${current.number ?? current.id.slice(0, 8)}** with **${previous.number ?? previous.id.slice(0, 8)}**.

| Setting | Current | Previous |
| --- | --- | --- |
| Compatibility date | ${current.compatibilityDate || 'None'} | ${previous.compatibilityDate || 'None'} |
| CPU limit | ${current.cpuLimitMs ?? 'Default'} | ${previous.cpuLimitMs ?? 'Default'} |
| Usage model | ${current.usageModel || 'Default'} | ${previous.usageModel || 'Default'} |

## Bindings

${formatNamedDiff(bindingDiff)}

## Exports

${formatNamedDiff(exportDiff)}

## Compatibility Flags

${formatNamedDiff(flagDiff)}`;
}

function compareNamedValues(current: string[], previous: string[]) {
  const currentSet = new Set(current);
  const previousSet = new Set(previous);
  return {
    added: current.filter((value) => !previousSet.has(value)),
    removed: previous.filter((value) => !currentSet.has(value)),
  };
}

function formatNamedDiff(diff: { added: string[]; removed: string[] }): string {
  if (!diff.added.length && !diff.removed.length) return '_No changes._';
  return [
    ...diff.added.map((value) => `- Added: \`${value}\``),
    ...diff.removed.map((value) => `- Removed: \`${value}\``),
  ].join('\n');
}

interface WorkerDetailProps {
  worker: Worker;
}

function formatOptionalDate(value?: string): string {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getBooleanTag(
  value?: boolean,
  enabledText = 'Enabled',
  disabledText = 'Disabled',
  disabledColor: Color = Color.Red,
) {
  return {
    color: value ? Color.Green : disabledColor,
    text: value ? enabledText : disabledText,
  };
}

function WorkerDetail(props: WorkerDetailProps) {
  const { worker } = props;
  const hasModules = getBooleanTag(
    worker.hasModules,
    'Yes',
    'No',
    Color.SecondaryText,
  );
  const hasAssets = getBooleanTag(
    worker.hasAssets,
    'Yes',
    'No',
    Color.SecondaryText,
  );
  const logpush = getBooleanTag(worker.logpush);

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={worker.id} />
          <List.Item.Detail.Metadata.Label
            title="Modified"
            text={new Date(worker.modifiedOn).toLocaleString()}
          />
          <List.Item.Detail.Metadata.Label
            title="Created"
            text={new Date(worker.createdOn).toLocaleString()}
          />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Compatibility" />
          <List.Item.Detail.Metadata.Label
            title="Date"
            text={worker.compatibilityDate || 'None'}
          />
          <List.Item.Detail.Metadata.TagList title="Flags">
            {worker.compatibilityFlags.length ? (
              worker.compatibilityFlags.map((flag) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={flag}
                  text={flag}
                />
              ))
            ) : (
              <List.Item.Detail.Metadata.TagList.Item text="None" />
            )}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Runtime" />
          <List.Item.Detail.Metadata.Label
            title="Usage Model"
            text={worker.usageModel || 'Standard'}
          />
          <List.Item.Detail.Metadata.TagList title="Handlers">
            {worker.handlers.length ? (
              worker.handlers.map((handler) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={handler}
                  text={handler}
                />
              ))
            ) : (
              <List.Item.Detail.Metadata.TagList.Item text="None" />
            )}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Logpush">
            <List.Item.Detail.Metadata.TagList.Item
              text={logpush.text}
              color={logpush.color}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Placement" />
          <List.Item.Detail.Metadata.Label
            title="Mode"
            text={worker.placement?.mode || 'Default'}
          />
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={worker.placement?.status || 'Unknown'}
          />
          <List.Item.Detail.Metadata.Label
            title="Last Analyzed"
            text={formatOptionalDate(worker.placement?.lastAnalyzedAt)}
          />
          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="Assets and Modules" />
          <List.Item.Detail.Metadata.TagList title="Has Modules">
            <List.Item.Detail.Metadata.TagList.Item
              text={hasModules.text}
              color={hasModules.color}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Has Assets">
            <List.Item.Detail.Metadata.TagList.Item
              text={hasAssets.text}
              color={hasAssets.color}
            />
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default withCloudflareAccessToken(Command);
