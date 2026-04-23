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

type PurgeType = 'url' | 'hostname' | 'tag' | 'prefix';

interface CachePurgeHistoryItem {
  url: string;
  lastPurged: string;
  count: number;
  type?: PurgeType;
}

const PURGE_FIELD_CONFIG: Record<
  PurgeType,
  { title: string; placeholder: string; info: string }
> = {
  url: {
    title: 'List of URL(s)',
    placeholder: 'https://example.com/foo\nhttps://example.com/bar',
    info: 'Separate URL(s) one per line or with commas. Purges assets in the cache that match the URL(s) exactly.',
  },
  hostname: {
    title: 'List of Hostname(s)',
    placeholder: 'www.example.com\nimages.example.com',
    info: 'Any assets at URLs with a host that matches one of the provided values will be purged from the cache. Separate one per line or with commas.',
  },
  tag: {
    title: 'List of Cache Tag(s)',
    placeholder: 'dog, cat, foobar',
    info: 'Any assets served with a Cache-Tag response header that matches one of the provided values will be purged. Up to 100 tags at a time. Separate with commas or one per line.',
  },
  prefix: {
    title: 'List of Prefix(es)',
    placeholder: 'example.com/foo\nexample.com/bar/',
    info: 'Any assets in the directory will be purged from cache. Separate one per line or with commas.',
  },
};

function parseEntries(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

const LAST_TYPE_KEY = (zoneId: string) => `cache-purge-last-type-${zoneId}`;
const LAST_ENTRIES_KEY = (zoneId: string, type: PurgeType) =>
  `cache-purge-last-entries-${zoneId}-${type}`;

export function CachePurgeView(props: SiteProps) {
  const { id } = props;
  const [purgeType, setPurgeType] = useState<PurgeType>('url');
  const [entries, setEntries] = useState<string>('');
  const [loaded, setLoaded] = useState(false);
  const field = PURGE_FIELD_CONFIG[purgeType];

  // Restore last selected purge type and its last entries on mount
  useEffect(() => {
    (async () => {
      const lastType =
        (await LocalStorage.getItem<string>(LAST_TYPE_KEY(id))) ?? 'url';
      const type = (['url', 'hostname', 'tag', 'prefix'] as PurgeType[]).includes(
        lastType as PurgeType,
      )
        ? (lastType as PurgeType)
        : 'url';
      const lastEntries =
        (await LocalStorage.getItem<string>(LAST_ENTRIES_KEY(id, type))) ?? '';
      setPurgeType(type);
      setEntries(lastEntries);
      setLoaded(true);
    })();
  }, [id]);

  // Load remembered entries whenever the type changes (after initial load)
  const handleTypeChange = async (value: string) => {
    const type = value as PurgeType;
    setPurgeType(type);
    await LocalStorage.setItem(LAST_TYPE_KEY(id), type);
    const remembered =
      (await LocalStorage.getItem<string>(LAST_ENTRIES_KEY(id, type))) ?? '';
    setEntries(remembered);
  };

  const handleSubmit = async (values: { entries: string }) => {
    await LocalStorage.setItem(LAST_TYPE_KEY(id), purgeType);
    await LocalStorage.setItem(
      LAST_ENTRIES_KEY(id, purgeType),
      values.entries ?? '',
    );
    await submitPurge(id, purgeType, values.entries ?? '');
  };

  const handlePurgeLast = async () => {
    const remembered =
      (await LocalStorage.getItem<string>(LAST_ENTRIES_KEY(id, purgeType))) ??
      '';
    if (!remembered.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'No previous purge',
        message: `No remembered ${purgeType} values for this site.`,
      });
      return;
    }
    await submitPurge(id, purgeType, remembered);
  };

  return (
    <Form
      isLoading={!loaded}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Hammer}
            title="Purge Cache"
            onSubmit={handleSubmit}
          />
          <Action
            icon={Icon.Repeat}
            title="Purge Last Saved Values"
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'r' }}
            onAction={handlePurgeLast}
          />
          <Action.Push
            icon={Icon.List}
            title="Purge History"
            target={<CachePurgeHistory id={id} accountId={''} />}
            shortcut={{ modifiers: ['cmd'], key: 'h' }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="purgeType"
        title="Purge By"
        value={purgeType}
        onChange={handleTypeChange}
      >
        <Form.Dropdown.Item value="url" title="URL" icon={Icon.Link} />
        <Form.Dropdown.Item
          value="hostname"
          title="Hostname"
          icon={Icon.Globe}
        />
        <Form.Dropdown.Item value="tag" title="Tag" icon={Icon.Tag} />
        <Form.Dropdown.Item value="prefix" title="Prefix" icon={Icon.Folder} />
      </Form.Dropdown>
      <Form.TextArea
        id="entries"
        title={field.title}
        placeholder={field.placeholder}
        info={field.info}
        value={entries}
        onChange={setEntries}
      />
    </Form>
  );
}

async function submitPurge(
  zoneId: string,
  type: PurgeType,
  rawValue: string,
) {
  const entries = parseEntries(rawValue);
  if (entries.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'No values provided',
      message: 'Please enter at least one value to purge.',
    });
    return;
  }
  if (type === 'tag' && entries.length > 100) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Too many tags',
      message: 'You can purge up to 100 tags at a time.',
    });
    return;
  }
  await purgeFromCache(zoneId, type, entries);
}

function CachePurgeHistory(props: SiteProps) {
  const { id } = props;

  const [state, setState] = useState<{ items: CachePurgeHistoryItem[] }>({
    items: [],
  });
  const [sortBy, setSortBy] = useState<'latest' | 'count' | 'oldest'>(
    'latest',
  );

  useEffect(() => {
    LocalStorage.getItem<string>(`cache-purge-sort-${id}`).then((value) => {
      if (value === 'latest' || value === 'count' || value === 'oldest') {
        setSortBy(value);
      }
    });
    LocalStorage.getItem<string>(`cache-purge-history-${id}`).then((items) => {
      if (items) {
        setState({ items: JSON.parse(items) });
      }
    });
  }, [id]);

  const sortedItems = [...state.items].sort((a, b) => {
    switch (sortBy) {
      case 'count':
        return b.count - a.count;
      case 'oldest':
        return (
          new Date(a.lastPurged).getTime() - new Date(b.lastPurged).getTime()
        );
      case 'latest':
      default:
        return (
          new Date(b.lastPurged).getTime() - new Date(a.lastPurged).getTime()
        );
    }
  });

  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort By"
          value={sortBy}
          onChange={(value) => {
            setSortBy(value as 'latest' | 'count' | 'oldest');
            LocalStorage.setItem(`cache-purge-sort-${id}`, value);
          }}
        >
          <List.Dropdown.Item title="Latest First" value="latest" />
          <List.Dropdown.Item title="Oldest First" value="oldest" />
          <List.Dropdown.Item title="Most Purged" value="count" />
        </List.Dropdown>
      }
    >
      {sortedItems.map((entry: CachePurgeHistoryItem, index) => {
        const type: PurgeType = entry.type ?? 'url';
        return (
          <List.Item
            key={index}
            title={entry.url}
            accessories={[
              { tag: type.toUpperCase() },
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
                  title="Purge Again"
                  shortcut={{ modifiers: ['cmd', 'shift'], key: 'p' }}
                  onAction={() => purgeFromCache(id, type, [entry.url])}
                />
                <Action
                  icon={Icon.Trash}
                  title="Remove from History"
                  shortcut={{ modifiers: ['cmd'], key: 'd' }}
                  onAction={() => {
                    const items = state.items.filter(
                      (item: CachePurgeHistoryItem) =>
                        !(item.url === entry.url && (item.type ?? 'url') === type),
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
        );
      })}
    </List>
  );
}

async function purgeFromCache(
  zoneId: string,
  type: PurgeType,
  entries: string[],
) {
  const typeLabel = {
    url: 'URL(s)',
    hostname: 'hostname(s)',
    tag: 'tag(s)',
    prefix: 'prefix(es)',
  }[type];

  if (
    !(await confirmAlert({
      title: `Do you really want to purge these ${typeLabel} from cache?`,
      message: entries.join('\n'),
      primaryAction: { title: 'Purge', style: Alert.ActionStyle.Destructive },
    }))
  ) {
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Purging ${typeLabel}`,
  });

  let result;
  switch (type) {
    case 'url':
      result = await service.purgeFilesbyURL(zoneId, entries);
      break;
    case 'hostname':
      result = await service.purgeByHostnames(zoneId, entries);
      break;
    case 'tag':
      result = await service.purgeByTags(zoneId, entries);
      break;
    case 'prefix':
      result = await service.purgeByPrefixes(zoneId, entries);
      break;
  }

  if (result.success) {
    toast.style = Toast.Style.Success;
    toast.title = `${typeLabel} purged`;

    LocalStorage.getItem<string>(`cache-purge-history-${zoneId}`).then(
      (items) => {
        const history: CachePurgeHistoryItem[] = items ? JSON.parse(items) : [];
        entries.forEach((entry) => {
          const index = history.findIndex(
            (item) => item.url === entry && (item.type ?? 'url') === type,
          );
          if (index !== -1) {
            history[index].lastPurged = new Date().toISOString();
            history[index].count++;
            history[index].type = type;
          } else {
            history.push({
              url: entry,
              lastPurged: new Date().toISOString(),
              count: 1,
              type,
            });
          }
        });
        LocalStorage.setItem(
          `cache-purge-history-${zoneId}`,
          JSON.stringify(history.slice(-100)),
        );
      },
    );

    return;
  }

  toast.style = Toast.Style.Failure;
  toast.title = `Failed to purge ${typeLabel}`;
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
