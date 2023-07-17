import { ActionPanel, Icon, List, Action, LocalStorage } from '@raycast/api';
import { faker, UsableLocale } from '@faker-js/faker';
import _ from 'lodash';
import isUrl from 'is-url';
import { useCallback, useEffect, useState } from 'react';

type LocalStorageValues = {
  pinnedItemIds: string;
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
  'science',
];

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

function FakerListItem(props: { item: Item; pin?: Pin; unpin?: Pin }) {
  const { item, pin, unpin } = props;
  const [value, setValue] = useState(item.value);
  const updateValue = async () => {
    setValue(item.getValue());
  };
  useEffect(() => {
    updateValue();
  }, [item]);

  return (
    <List.Item
      title={_.startCase(item.id)}
      icon={Icon.Dot}
      keywords={[item.section]}
      detail={<List.Item.Detail markdown={value} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy to Clipboard" content={value} onCopy={updateValue} />
          <Action.Paste title="Paste in Active App" content={value} onPaste={updateValue} />
          {isUrl(value) && <Action.OpenInBrowser url={value} shortcut={{ modifiers: ['cmd'], key: 'o' }} />}
          {pin && (
            <Action
              title="Pin Entry"
              icon={Icon.Pin}
              shortcut={{ modifiers: ['shift', 'cmd'], key: 'p' }}
              onAction={() => pin(item)}
            />
          )}
          {unpin && (
            <Action
              title="Unpin Entry"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ['shift', 'cmd'], key: 'p' }}
              onAction={() => unpin(item)}
            />
          )}
          <Action
            title="Refresh Value"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ['ctrl'], key: 'r' }}
            onAction={updateValue}
          />
        </ActionPanel>
      }
    />
  );
}

function Locales(props: { onChange: () => void }) {
  const { onChange } = props;

  return (
    <List.Dropdown
      tooltip="Change Language"
      value={faker.locale}
      onChange={(newLocale) => {
        faker.locale = newLocale;
        LocalStorage.setItem('locale', newLocale);
        onChange();
      }}
    >
      {Object.entries(faker.locales).map(([localeKey, locale]) => {
        if (!locale) return null;

        return <List.Dropdown.Item key={localeKey} title={locale.title} value={localeKey} />;
      })}
    </List.Dropdown>
  );
}

export default function FakerList() {
  const [items, setItems] = useState<Item[]>([]);
  const generateItems = useCallback(() => {
    setItems(buildItems(''));
  }, []);

  const [groupedItems, setGroupedItems] = useState<Record<string, Item[]>>({});
  const [pinnedItems, setPinnedItems] = useState<Item[]>([]);
  useEffect(() => {
    const init = async () => {
      const locale = (await LocalStorage.getItem('locale')) || 'en';
      faker.setLocale(locale as UsableLocale);
      generateItems();
    };
    init();
  }, [generateItems]);

  useEffect(() => {
    const fetchPinnedItems = async () => {
      if (items.length === 0) return;

      const values: LocalStorageValues = await LocalStorage.allItems();
      const pinnedItemIds = JSON.parse(values.pinnedItemIds || '{}');
      const pinnedItems = _.map(pinnedItemIds, (pinnedItemId) => _.find(items, pinnedItemId)) as Item[];

      setGroupedItems(_.groupBy(items, 'section'));
      setPinnedItems(pinnedItems);
    };
    fetchPinnedItems();
  }, [items]);

  const handlePinnedItemsChange = (nextPinnedItems: Item[]) => {
    setPinnedItems(nextPinnedItems);
    const nextPinnedItemIds = _.map(nextPinnedItems, ({ section, id }) => ({
      section,
      id,
    }));
    LocalStorage.setItem('pinnedItemIds', JSON.stringify(nextPinnedItemIds));
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

  const isLoading = Object.values(groupedItems).length === 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={isLoading ? null : <Locales onChange={generateItems} />}
    >
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
