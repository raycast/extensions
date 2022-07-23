import {
  ActionPanel,
  CopyToClipboardAction,
  Icon,
  List,
  OpenInBrowserAction,
  PasteAction,
  getPreferenceValues,
  allLocalStorageItems,
  setLocalStorageItem,
} from '@raycast/api';
import { faker } from '@faker-js/faker';
import _ from 'lodash';
import isUrl from 'is-url';
import { useCallback, useEffect, useState } from 'react';

type LocalStorageValues = {
  pinnedItemIds: string;
};

type Preferences = {
  locale: string;
};

type Item = {
  section: string;
  id: string;
  value: string;
  getValue(): string;
};

type Pin = (item: Item) => void;

const blacklistPaths = [
  'locales',
  'locale',
  'localeFallback',
  'definitions',
  'fake',
  'faker',
  'unique',
  'helpers',
  'mersenne',
  'random',
];

const { locale }: Preferences = getPreferenceValues();
faker.locale = locale;

const buildItems = (path: string) => {
  return _.reduce(
    path ? _.get(faker, path) : faker,
    (acc: Item[], func, key) => {
      if (blacklistPaths.includes(key)) {
        return acc;
      }

      if (_.isFunction(func)) {
        const getValue = (): string => {
          const value = func();
          return value ? value.toString() : '';
        };
        acc.push({ section: path, id: key, value: getValue(), getValue });
      } else if (_.isObject(func)) {
        acc.push(...buildItems(path ? `${path}.${key}` : key));
      }

      return acc;
    },
    []
  );
};

const items = buildItems('');
const groupedItems = _.groupBy(items, 'section');

function FakerListItem(props: { item: Item; pin?: Pin; unpin?: Pin }) {
  const { item, pin, unpin } = props;
  const [value, setValue] = useState(item.value);

  return (
    <List.Item
      title={_.startCase(item.id)}
      icon={Icon.Dot}
      keywords={[item.section]}
      detail={<List.Item.Detail markdown={value} />}
      actions={
        <ActionPanel>
          <CopyToClipboardAction title="Copy to Clipboard" content={value} />
          <PasteAction title="Paste in Active App" content={value} />
          {isUrl(value) && <OpenInBrowserAction url={value} shortcut={{ modifiers: ['cmd'], key: 'o' }} />}
          {pin && (
            <ActionPanel.Item
              title="Pin Entry"
              icon={Icon.Pin}
              shortcut={{ modifiers: ['shift', 'cmd'], key: 'p' }}
              onAction={() => pin(item)}
            />
          )}
          {unpin && (
            <ActionPanel.Item
              title="Unpin Entry"
              icon={Icon.XmarkCircle}
              shortcut={{ modifiers: ['shift', 'cmd'], key: 'p' }}
              onAction={() => unpin(item)}
            />
          )}
          <ActionPanel.Item
            title="Refresh Value"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ['ctrl'], key: 'r' }}
            onAction={async () => {
              setValue(item.getValue());
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function FakerList() {
  const [pinnedItems, setPinnedItems] = useState<Item[]>([]);

  const fetchPinnedItems = useCallback(async () => {
    const values: LocalStorageValues = await allLocalStorageItems();
    const pinnedItemIds = JSON.parse(values.pinnedItemIds || '{}');
    const pinnedItems = _.map(pinnedItemIds, (pinnedItemId) => _.find(items, pinnedItemId)) as Item[];
    setPinnedItems(pinnedItems);
  }, []);

  useEffect(() => {
    fetchPinnedItems();
  }, [fetchPinnedItems]);

  const handlePinnedItemsChange = (nextPinnedItems: Item[]) => {
    setPinnedItems(nextPinnedItems);
    const nextPinnedItemIds = _.map(nextPinnedItems, ({ section, id }) => ({
      section,
      id,
    }));
    setLocalStorageItem('pinnedItemIds', JSON.stringify(nextPinnedItemIds));
  };

  const pin = (item: Item) => {
    const nextPinnedItems = [...pinnedItems, item];
    handlePinnedItemsChange(nextPinnedItems);
  };

  const unpin = (item: Item) => {
    const nextPinnedItems = _.reject(pinnedItems, {
      section: item.section,
      id: item.id,
    });
    handlePinnedItemsChange(nextPinnedItems);
  };

  return (
    <List isShowingDetail>
      {pinnedItems.length > 0 && (
        <List.Section key="pinned" title="Pinned">
          {_.map(pinnedItems, (item) => (
            <FakerListItem key={item.id} item={item} unpin={unpin} />
          ))}
        </List.Section>
      )}
      {_.map(groupedItems, (items, section) => (
        <List.Section key={section} title={_.startCase(section)}>
          {_.map(items, (item) => (
            <FakerListItem key={item.id} item={item} pin={pin} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
