import { Action, ActionPanel, Color, Icon, List } from '@raycast/api';
import { useState } from 'react';

import Service, { Worker } from './service';
import { getToken, getWorkerUrl, handleNetworkError } from './utils';
import { useCachedPromise } from '@raycast/utils';

const service = new Service(getToken());

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
      const accounts = await service.listAccounts();
      const workers: Record<string, Worker[]> = {};
      const workerRequests = accounts.map(async (account) => {
        const accountWorkers = await service.listWorkers(account.id);
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

export default Command;
