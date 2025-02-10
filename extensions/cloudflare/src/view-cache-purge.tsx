import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from '@raycast/api';
import { useEffect, useState } from 'react';
import Service, { Zone } from './service';
import { getToken } from './utils';
import { SiteProps } from './view-sites';

const service = new Service(getToken());

interface CachePurgeHistoryItem {
  url: string;
  lastPurged: string;
  count: number;
}

export function CachePurgeView(props: SiteProps) {
  const { id } = props;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Hammer}
            title="Purge Files"
            onSubmit={(values) => clearUrlsFromCache(id, values.urls)}
          />
          <Action.Push
            icon={Icon.List}
            title="File Purge History"
            target={<CachePurgeHistory id={id} accountId={''} />}
            shortcut={{ modifiers: ['cmd'], key: 'h' }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="urls"
        title="List of URL(s)"
        placeholder="Separate URL(s) one per line"
      />
    </Form>
  );
}

function CachePurgeHistory(props: SiteProps) {
  const { id } = props;

  const [state, setState] = useState({ items: [] });

  useEffect(() => {
    LocalStorage.getItem<string>(`cache-purge-history-${id}`).then((items) => {
      if (items) {
        setState({ items: JSON.parse(items) });
      }
    });
  });

  return (
    <List>
      {state.items.map((entry: CachePurgeHistoryItem, index) => (
        <List.Item
          key={index}
          title={entry.url}
          accessories={[
            { text: `${entry.count} time(s) purged` },
            {
              text: `Last purged at ${new Date(
                entry.lastPurged,
              ).toLocaleString()}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Hammer}
                title="Purge URL"
                shortcut={{ modifiers: ['cmd', 'shift'], key: 'p' }}
                onAction={() => clearUrlsFromCache(id, entry.url)}
              />
              <Action
                icon={Icon.Trash}
                title="Remove From History"
                shortcut={{ modifiers: ['cmd'], key: 'd' }}
                onAction={() => {
                  const items = state.items.filter(
                    (item: CachePurgeHistoryItem) => item.url !== entry.url,
                  );
                  LocalStorage.setItem(
                    `cache-purge-history-${id}`,
                    JSON.stringify(items),
                  );
                  setState({ items });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function clearUrlsFromCache(zoneId: string, urls: string) {
  if (
    !(await confirmAlert({
      title: 'Do you really want to purge the files from cache?',
      primaryAction: { title: 'Purge', style: Alert.ActionStyle.Destructive },
    }))
  ) {
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: 'Purging URL(s)',
  });

  // Split URLs by newline
  const urlList = urls.split('\n');

  const result = await service.purgeFilesbyURL(zoneId, urlList);

  if (result.success) {
    toast.style = Toast.Style.Success;
    toast.title = 'URL(s) purged';

    // Add purged URLs as CachePurgeHistoryItem to history
    LocalStorage.getItem<string>(`cache-purge-history-${zoneId}`).then(
      (items) => {
        if (items) {
          const history = JSON.parse(items);
          urlList.forEach((url) => {
            // If in history, update lastPurged and count
            const index = history.findIndex(
              (entry: CachePurgeHistoryItem) => entry.url === url,
            );
            if (index !== -1) {
              history[index].lastPurged = new Date().toISOString();
              history[index].count++;
            } else {
              // If not in history, add new entry
              history.push({
                url,
                lastPurged: new Date().toISOString(),
                count: 1,
              });
            }
          });
          // Save last 100 items in local storage
          LocalStorage.setItem(
            `cache-purge-history-${zoneId}`,
            JSON.stringify(history.slice(-100)),
          );
        } else {
          const history = urlList.map((url) => ({
            url,
            lastPurged: new Date().toISOString(),
            count: 1,
          }));
          LocalStorage.setItem(
            `cache-purge-history-${zoneId}`,
            JSON.stringify(history),
          );
        }
      },
    );

    return;
  }

  toast.style = Toast.Style.Failure;
  toast.title = 'Failed to purge URL(s)';
  if (result.errors.length > 0) {
    toast.message = result.errors[0].message;
  }
}

export async function purgeEverything(zone: Zone) {
  if (
    !(await confirmAlert({
      title:
        'Do you really want to purge everything from cache for ' +
        zone.name +
        '?',
      primaryAction: { title: 'Purge', style: Alert.ActionStyle.Destructive },
    }))
  ) {
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: 'Purging cache',
  });

  const result = await service.purgeEverything(zone.id);

  if (result.success) {
    toast.style = Toast.Style.Success;
    toast.title = 'Cache purged';
    return;
  }

  toast.style = Toast.Style.Failure;
  toast.title = 'Failed to purge cache';
  if (result.errors.length > 0) {
    toast.message = result.errors[0].message;
  }
}
