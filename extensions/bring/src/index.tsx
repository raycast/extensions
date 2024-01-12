import { useRef, useState } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { BringAPI, BringCustomItem, BringList, Translations, BringListInfo } from "./lib/bringAPI";
import { getIconPlaceholder, getImageUrl, getLocaleForListFromSettings } from "./lib/helpers";
import { Item, ItemsGrid, Section } from "./components/ItemsGrid";
import { getOrCreateCustomSection, getSectionsFromData, getListData, getTranslationsData } from "./lib/bringService";

export default function Command() {
  const bringApiRef = useRef<Promise<BringAPI> | null>(null);
  const [selectedList, setSelectedList] = useCachedState<BringListInfo | undefined>("selectedList");
  const [locale, setLocale] = useCachedState<string | undefined>("locale");
  const [search, setSearch] = useState<string>("");

  const { data: lists = [], isLoading: isLoadingLists } = useCachedPromise(async () => {
    const bringApi = await getBringApi();

    const { lists } = await bringApi.getLists();
    // if there is only one list, use it
    if (lists.length === 1) {
      setSelectedList(lists[0]);
    }

    return lists;
  });

  const {
    data: [listDetail, customItems],
    isLoading: isLoadingList,
    mutate,
  } = useCachedPromise(
    async (selectedList?: BringListInfo) => {
      if (!selectedList) {
        return Promise.resolve<[BringList | undefined, BringCustomItem[]]>([undefined, []]);
      }

      const bringApi = await getBringApi();
      const locale = await bringApi.getUserSettings().then(getLocaleForListFromSettings(selectedList.listUuid));
      setLocale(locale);

      return getListData(bringApi, selectedList.listUuid);
    },
    [selectedList],
    {
      initialData: [undefined, []],
    },
  );

  const { data: [catalog, translations] = [] } = useCachedPromise(
    async (locale: string | undefined) => {
      if (!locale) return Promise.resolve([undefined, undefined]);

      const bringApi = await getBringApi();

      return getTranslationsData(bringApi, locale);
    },
    [locale],
  );

  async function getBringApi(): Promise<BringAPI> {
    if (!bringApiRef.current) {
      const bringApi = new BringAPI();
      const { email, password } = getPreferenceValues<ExtensionPreferences>();
      bringApiRef.current = bringApi.login(email, password);
    }

    return await bringApiRef.current;
  }

  function addToList(list: BringListInfo): (item: Item, specification?: string) => Promise<void> {
    if (!list) return async () => {};

    return async (item: Item, specification?: string) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: `Adding ${item.name} to ${list.name}` });
      try {
        const bringApi = await getBringApi();
        if (!bringApi) return;
        await mutate(bringApi.addItemToList(list.listUuid, item.itemId, specification), {
          optimisticUpdate: (data) => {
            const [list, customItems] = data as [BringList, BringCustomItem[]];
            list.purchase.push({ name: item.itemId, specification });
            return [list, customItems];
          },
        });
        toast.title = `Added ${item.name} to ${list.name}`;
        toast.style = Toast.Style.Success;
        setSearch("");
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `Could not add ${item.name} to ${list.name}`;
        toast.message = (error as Error).message;
      }
    };
  }

  function removeFromList(list: BringListInfo): (item: Item) => Promise<void> {
    if (!list) return async () => {};

    return async (item: Item) => {
      const toast = await showToast({ style: Toast.Style.Animated, title: `Removing ${item.name} from ${list.name}` });
      try {
        const bringApi = await getBringApi();
        if (!bringApi) return;
        await mutate(bringApi.removeItemFromList(list.listUuid, item.itemId), {
          optimisticUpdate: (data) => {
            const [list, customItems] = data as [BringList, BringCustomItem[]];
            list.purchase = list.purchase.filter((listItem) => listItem.name !== item.itemId);
            return [list, customItems];
          },
        });
        toast.title = `Removed ${item.name} from ${list.name}`;
        toast.style = Toast.Style.Success;
        setSearch("");
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = `Could not remove ${item.name} from ${list.name}`;
        toast.message = (error as Error).message;
      }
    };
  }

  if (!selectedList) {
    return (
      <List isLoading={isLoadingLists} navigationTitle="Choose a List to Add Items to">
        {lists.map((list) => (
          <List.Item
            key={list.listUuid}
            title={list.name}
            actions={
              <ActionPanel>
                <Action title="Select List" onAction={() => setSelectedList(list)} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  let sections = getSectionsFromData(catalog, listDetail, customItems, translations);
  sections = addNewItemToSectionBasedOnSearch(sections, search, translations);

  return (
    <ItemsGrid
      list={selectedList}
      sections={sections}
      searchText={search}
      isLoading={isLoadingList}
      showAddedItemsOnTop={search.length === 0}
      canSwitchList={lists.length > 1}
      onSearchTextChange={setSearch}
      onAddAction={addToList(selectedList)}
      onRemoveAction={removeFromList(selectedList)}
      onResetList={() => {
        setSelectedList(undefined);
      }}
    />
  );
}

function addNewItemToSectionBasedOnSearch(sections: Section[], search: string, translations?: Translations): Section[] {
  if (
    translations &&
    search.length > 0 &&
    !sections.some((section) => section.items.find((item) => item.name.toLowerCase() === search.toLowerCase()))
  ) {
    const customSection = getOrCreateCustomSection(sections, translations);
    customSection.items.push({
      itemId: search,
      name: search,
      image: getImageUrl(search),
      fallback: getIconPlaceholder(search),
      isInPurchaseList: false,
    });
  }

  return sections;
}
