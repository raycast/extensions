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
import Service, { CachePurgeResult, Zone } from './service';
import { getToken } from './utils';
import { SiteProps } from './view-sites';

const service = new Service(getToken());

type PurgeType = 'url' | 'hostname' | 'tag' | 'prefix';
const PURGE_TYPES: readonly PurgeType[] = [
  'url',
  'hostname',
  'tag',
  'prefix',
] as const;

function isPurgeType(value: unknown): value is PurgeType {
  return (
    typeof value === 'string' &&
    (PURGE_TYPES as readonly string[]).includes(value)
  );
}

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

type RememberedEntries = Record<PurgeType, string>;

interface InitialState {
  type: PurgeType;
  entriesByType: RememberedEntries;
}

async function loadInitialState(zoneId: string): Promise<InitialState> {
  const [storedType, ...storedEntries] = await Promise.all([
    LocalStorage.getItem<string>(LAST_TYPE_KEY(zoneId)),
    ...PURGE_TYPES.map((type) =>
      LocalStorage.getItem<string>(LAST_ENTRIES_KEY(zoneId, type)),
    ),
  ]);
  const type = isPurgeType(storedType) ? storedType : 'url';
  const entriesByType = PURGE_TYPES.reduce((acc, t, i) => {
    acc[t] = storedEntries[i] ?? '';
    return acc;
  }, {} as RememberedEntries);
  return { type, entriesByType };
}

export function CachePurgeView(props: SiteProps) {
  const { id } = props;
  const [initialState, setInitialState] = useState<InitialState | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadInitialState(id).then((state) => {
      if (!cancelled) setInitialState(state);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!initialState) {
    return <Form isLoading />;
  }

  return <CachePurgeForm zoneId={id} initialState={initialState} />;
}

interface CachePurgeFormProps {
  zoneId: string;
  initialState: InitialState;
}

function CachePurgeForm({ zoneId, initialState }: CachePurgeFormProps) {
  const [purgeType, setPurgeType] = useState<PurgeType>(initialState.type);
  const [entriesByType, setEntriesByType] = useState<RememberedEntries>(
    initialState.entriesByType,
  );
  const field = PURGE_FIELD_CONFIG[purgeType];
  const entries = entriesByType[purgeType];

  const handleTypeChange = (value: string) => {
    if (!isPurgeType(value) || value === purgeType) return;
    setPurgeType(value);
    void LocalStorage.setItem(LAST_TYPE_KEY(zoneId), value);
  };

  const handleEntriesChange = (value: string) => {
    setEntriesByType((prev) => ({ ...prev, [purgeType]: value }));
  };

  const handleSubmit = async (values: { entries: string }) => {
    const rawValue = values.entries ?? '';
    const initiated = await submitPurge(zoneId, purgeType, rawValue);
    if (initiated) {
      await Promise.all([
        LocalStorage.setItem(LAST_TYPE_KEY(zoneId), purgeType),
        LocalStorage.setItem(LAST_ENTRIES_KEY(zoneId, purgeType), rawValue),
      ]);
      setEntriesByType((prev) => ({ ...prev, [purgeType]: rawValue }));
    }
  };

  const handlePurgeLast = async () => {
    const remembered = entriesByType[purgeType];
    if (!remembered.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'No previous purge',
        message: `No remembered ${purgeType} values for this site.`,
      });
      return;
    }
    await submitPurge(zoneId, purgeType, remembered);
  };

  return (
    <Form
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
            target={<CachePurgeHistory id={zoneId} accountId={''} />}
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
        onChange={handleEntriesChange}
      />
    </Form>
  );
}

async function submitPurge(
  zoneId: string,
  type: PurgeType,
  rawValue: string,
): Promise<boolean> {
  const entries = parseEntries(rawValue);
  if (entries.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'No values provided',
      message: 'Please enter at least one value to purge.',
    });
    return false;
  }
  if (type === 'tag' && entries.length > 100) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Too many tags',
      message: 'You can purge up to 100 tags at a time.',
    });
    return false;
  }
  return await purgeFromCache(zoneId, type, entries);
}

function CachePurgeHistory(props: SiteProps) {
  const { id } = props;

  const [state, setState] = useState<{ items: CachePurgeHistoryItem[] }>({
    items: [],
  });
  const [sortBy, setSortBy] = useState<'latest' | 'count' | 'oldest'>('latest');

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
                        !(
                          item.url === entry.url &&
                          (item.type ?? 'url') === type
                        ),
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
): Promise<boolean> {
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
    return false;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Purging ${typeLabel}`,
  });

  let result: CachePurgeResult;
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
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unhandled purge type: ${_exhaustive}`);
    }
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

    return true;
  }

  toast.style = Toast.Style.Failure;
  toast.title = `Failed to purge ${typeLabel}`;
  if (result.errors.length > 0) {
    toast.message = result.errors[0].message;
  }
  return false;
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
