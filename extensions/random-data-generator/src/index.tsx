import _ from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Action, ActionPanel, Icon, Keyboard, List, LocalStorage, useNavigation } from "@raycast/api";

import { listTemplateMethods } from "@/ai";
import CustomItemForm from "@/components/CustomItemForm";
import type { Item } from "@/components/FakerListItem";
import FakerListItem from "@/components/FakerListItem";
import Locales from "@/components/Locales";
import { CUSTOM_SECTION, CustomItem, customItemToItem, loadCustomItems, saveCustomItems } from "@/customItems";
import fakerClient from "@/faker";
import { buildItems } from "@/utils";

type PinnedRef = { section: string; id: string };

function parsePinnedRefs(raw: string | undefined): PinnedRef[] {
  try {
    // Older versions stored "{}" when nothing was pinned, so anything that is not an array means no pins.
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(({ section, id }) => ({ section, id })) : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default function FakerList() {
  const { push } = useNavigation();
  const [isReady, setIsReady] = useState(false);
  const [locale, setLocale] = useState(fakerClient.locale);
  const [fakerItems, setFakerItems] = useState<Item[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [pinnedRefs, setPinnedRefs] = useState<PinnedRef[]>([]);
  const [searchText, setSearchText] = useState("");

  // Custom entries render against the active locale, so they are rebuilt whenever fakerItems change with it.
  const items = useMemo(() => [...customItems.map(customItemToItem), ...fakerItems], [customItems, fakerItems]);
  const groupedItems = useMemo(() => _.groupBy(items, "section"), [items]);
  const pinnedItems = useMemo(
    () =>
      _.compact(pinnedRefs.map(({ section, id }) => items.find((item) => item.section === section && item.id === id))),
    [pinnedRefs, items],
  );
  const availableMethods = useMemo(() => listTemplateMethods(fakerClient.faker), []);

  // Custom rows keep their rendered value in state, so the key includes the template to remount them after an edit.
  const itemKey = (item: Item) =>
    `${locale}:${item.section}:${item.id}${item.custom ? `:${item.custom.template}` : ""}`;

  const handleLocaleChange = useCallback((nextLocale: string) => {
    // The dropdown fires onChange with its current value on mount; skip rebuilding every item for that.
    if (nextLocale === fakerClient.locale) return;
    fakerClient.setLocale(nextLocale);
    LocalStorage.setItem("locale", nextLocale);
    setLocale(nextLocale);
    setFakerItems(buildItems("", fakerClient.faker));
  }, []);

  // Everything is loaded before the first render of the list, so Raycast selects the first pinned item
  // instead of keeping a selection made before the Pinned section appeared above it.
  useEffect(() => {
    const init = async () => {
      const [storedLocale, storedPinnedRefs, storedCustomItems] = await Promise.all([
        LocalStorage.getItem<string>("locale"),
        LocalStorage.getItem<string>("pinnedItemIds"),
        loadCustomItems(),
      ]);
      fakerClient.setLocale(storedLocale || "en");
      setLocale(fakerClient.locale);
      setPinnedRefs(parsePinnedRefs(storedPinnedRefs));
      setCustomItems(storedCustomItems);
      setFakerItems(buildItems("", fakerClient.faker));
      setIsReady(true);
    };
    init();
  }, []);

  const handlePinnedRefsChange = (nextPinnedRefs: PinnedRef[]) => {
    setPinnedRefs(nextPinnedRefs);
    LocalStorage.setItem("pinnedItemIds", JSON.stringify(nextPinnedRefs));
  };

  const pin = (item: Item) => {
    handlePinnedRefsChange([...pinnedRefs, { section: item.section, id: item.id }]);
  };

  const unpin = (item: Item) => {
    handlePinnedRefsChange(_.reject(pinnedRefs, { section: item.section, id: item.id }));
  };

  const persistCustomItems = (nextCustomItems: CustomItem[]) => {
    setCustomItems(nextCustomItems);
    saveCustomItems(nextCustomItems);
  };

  const saveCustomItem = (customItem: CustomItem) => {
    const exists = _.some(customItems, { id: customItem.id });
    const nextCustomItems = exists
      ? customItems.map((existing) => (existing.id === customItem.id ? customItem : existing))
      : [...customItems, customItem];
    persistCustomItems(nextCustomItems);
  };

  const createCustomItem = () => {
    push(<CustomItemForm initialPrompt={searchText} availableMethods={availableMethods} onSave={saveCustomItem} />);
  };

  const editCustomItem = (item: Item) => {
    if (!item.custom) return;
    push(<CustomItemForm item={item.custom} availableMethods={availableMethods} onSave={saveCustomItem} />);
  };

  const deleteCustomItem = (item: Item) => {
    persistCustomItems(_.reject(customItems, { id: item.id }));
    if (_.some(pinnedRefs, { section: item.section, id: item.id })) unpin(item);
  };

  const customItemProps = { onCreate: createCustomItem, onEdit: editCustomItem, onDelete: deleteCustomItem };

  return (
    <List
      isShowingDetail
      isLoading={!isReady}
      onSearchTextChange={setSearchText}
      filtering
      searchBarAccessory={<Locales value={locale} onChange={handleLocaleChange} />}
    >
      {isReady && pinnedItems.length > 0 && (
        <List.Section key="pinned" title="Pinned">
          {_.map(pinnedItems, (item) => (
            <FakerListItem key={itemKey(item)} item={item} unpin={unpin} {...customItemProps} />
          ))}
        </List.Section>
      )}
      {isReady && (
        <List.Section key={CUSTOM_SECTION} title="Custom">
          {groupedItems[CUSTOM_SECTION]?.length ? (
            _.map(groupedItems[CUSTOM_SECTION], (item) => (
              <FakerListItem key={itemKey(item)} item={item} pin={pin} {...customItemProps} />
            ))
          ) : (
            <List.Item
              title="Create Custom Item…"
              icon={Icon.Plus}
              keywords={["custom", "new", "create"]}
              detail={
                <List.Item.Detail markdown="Create your own generators, such as an integer between 5 and 10 or a full name with an email. Describe what you want and let Raycast AI write the template, or write it yourself." />
              }
              actions={
                <ActionPanel>
                  <Action
                    title="Create Custom Item"
                    icon={Icon.Plus}
                    shortcut={Keyboard.Shortcut.Common.New}
                    onAction={createCustomItem}
                  />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
      {_.map(isReady ? _.omit(groupedItems, CUSTOM_SECTION) : {}, (items, section) => (
        <List.Section key={section} title={_.startCase(section)}>
          {_.map(items, (item) => (
            <FakerListItem key={itemKey(item)} item={item} pin={pin} {...customItemProps} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
