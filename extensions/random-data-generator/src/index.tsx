import { ActionPanel, Icon, List, Action, LocalStorage } from '@raycast/api';
import { faker, UsableLocale } from '@faker-js/faker';
import _ from 'lodash';
import isUrl from 'is-url';
import { useEffect, useState } from 'react';

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

  return (
    <List.Item
      title={_.startCase(item.id)}
      icon={Icon.Dot}
      keywords={[item.section]}
      detail={<List.Item.Detail markdown={value} />}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy to Clipboard" content={value} />
          <Action.Paste title="Paste in Active App" content={value} />
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
            onAction={async () => {
              setValue(item.getValue());
            }}
          />
          <Action.Push
            icon={Icon.Map}
            shortcut={{ modifiers: ['ctrl'], key: 'f' }}
            title="Choose default language"
            target={<Locales />}
          />
        </ActionPanel>
      }
    />
  );
}

function FakerList() {
  const [groupedItems, setGroupedItems] = useState<Record<string, Item[]>>({});
  const [pinnedItems, setPinnedItems] = useState<Item[]>([]);
  useEffect(() => {
    const init = async () => {
      const locale = (await LocalStorage.getItem('locale')) || 'en';
      faker.setLocale(locale as UsableLocale);

      const items = buildItems('');
      const values: LocalStorageValues = await LocalStorage.allItems();
      const pinnedItemIds = JSON.parse(values.pinnedItemIds || '{}');
      const pinnedItems = _.map(pinnedItemIds, (pinnedItemId) => _.find(items, pinnedItemId)) as Item[];

      setGroupedItems(_.groupBy(items, 'section'));
      setPinnedItems(pinnedItems);
    };
    init();
  }, []);

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

function Locales() {
  return (
    <List searchBarPlaceholder="Choose default language">
      <List.Section title="Languages">
        {Object.entries(faker.locales).map(([key, locale]) => {
          if (!locale) return null;

          return (
            <List.Item
              key={key}
              icon={Icon.Dot}
              title={locale.title}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Choose language"
                      target={<FakerList />}
                      onPush={() => {
                        faker.locale = key;
                        LocalStorage.setItem('locale', key);
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

export default function Command() {
  return <FakerList />;
}
