import { Action, ActionPanel, Detail, Icon, List } from '@raycast/api';
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
                  icon={Icon.Code}
                  title={worker.id}
                  accessories={[
                    {
                      text: new Date(worker.modifiedOn).toLocaleDateString(),
                      tooltip: `Modified: ${worker.modifiedOn}`,
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.Push
                          icon={Icon.Document}
                          title="Show Details"
                          target={
                            <WorkerView accountId={accountId} worker={worker} />
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

interface WorkerViewProps {
  accountId: string;
  worker: Worker;
}

function WorkerView(props: WorkerViewProps) {
  const { accountId, worker } = props;

  const markdown = `
# Worker

## Name

${worker.id}

## Usage Model

${worker.usageModel || 'Standard'}

## Placement

${worker.placementMode || 'Default'}
  `;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Modified"
            text={new Date(worker.modifiedOn).toLocaleString()}
          />
          <Detail.Metadata.Label
            title="Created"
            text={new Date(worker.createdOn).toLocaleString()}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Has Modules"
            icon={worker.hasModules ? Icon.Check : Icon.Xmark}
          />
          <Detail.Metadata.Label
            title="Has Assets"
            icon={worker.hasAssets ? Icon.Check : Icon.Xmark}
          />
          <Detail.Metadata.Label
            title="Logpush"
            icon={worker.logpush ? Icon.Check : Icon.Xmark}
          />
        </Detail.Metadata>
      }
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
  );
}

export default Command;
