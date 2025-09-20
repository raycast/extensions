import type { UsableLocale } from "@faker-js/faker";
import _ from "lodash";
import { useCallback, useEffect, useState } from "react";

import { List, LocalStorage } from "@raycast/api";

import type { Item } from "@/components/FakerListItem";
import FakerListItem from "@/components/FakerListItem";
import Locales from "@/components/Locales";
import faker from "@/faker";
import { buildItems } from "@/utils";

type LocalStorageValues = {
  pinnedItemIds: string;
};

export default function FakerList() {
  const [items, setItems] = useState<Item[]>([]);
  const generateItems = useCallback(() => {
    setItems(buildItems("", faker));
  }, []);

  const [groupedItems, setGroupedItems] = useState<Record<string, Item[]>>({});
  const [pinnedItems, setPinnedItems] = useState<Item[]>([]);
  useEffect(() => {
    const init = async () => {
      const locale = (await LocalStorage.getItem("locale")) || "en";
      faker.setLocale(locale as UsableLocale);
      generateItems();
    };
    init();
  }, [generateItems]);

  useEffect(() => {
    const fetchPinnedItems = async () => {
      if (items.length === 0) return;

      const values: LocalStorageValues = await LocalStorage.allItems();
      const pinnedItemIds = JSON.parse(values.pinnedItemIds || "{}");
      const pinnedItems = _.map(pinnedItemIds, (pinnedItemId) => _.find(items, pinnedItemId)) as Item[];

      setGroupedItems(_.groupBy(items, "section"));
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
    LocalStorage.setItem("pinnedItemIds", JSON.stringify(nextPinnedItemIds));
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
      searchBarAccessory={isLoading ? null : <Locales onChange={generateItems} faker={faker} />}
    >
      {pinnedItems.length > 0 && (
        <List.Section key="pinned" title="Pinned">
          {_.map(pinnedItems, (item) => (
            <FakerListItem key={item.id} item={item} unpin={unpin} faker={faker} />
          ))}
        </List.Section>
      )}
      {_.map(groupedItems, (items, section) => (
        <List.Section key={section} title={_.startCase(section)}>
          {_.map(items, (item) => (
            <FakerListItem key={item.id} item={item} pin={pin} faker={faker} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
