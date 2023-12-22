import { useRef, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { Grid, Color, getPreferenceValues, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { BringAPI, Catalog, CustomItem, List } from "./lib/api";
import { getFallbackChar, getImageUrl, getLocaleFromSettings } from "./lib/helper";

interface Item {
  name: string;
  image: string;
  fallback: string;
  isInPurchaseList: boolean;
}

interface Section {
  name: string;
  sectionId: string;
  items: Item[];
}

const ColorBringRed = "rgb(238, 82, 79)";
const ColorBringGreen = "rgb(79, 171, 162)";

export default function Command() {
  const [search, setSearch] = useState<string>("");
  const bringApiRef = useRef<BringAPI | null>(null);

  const {
    isLoading,
    data: [catalog, customItems, list],
    mutate,
  } = useCachedPromise(
    async () => {
      const bringApi = getBringApi();
      await bringApi.login();
      const locale = await bringApi.getUserSettings().then(getLocaleFromSettings);
      return Promise.all([bringApi.getCatalog(locale), bringApi.getListCustomItems(), bringApi.getList()]);
    },
    [],
    {
      initialData: [{ catalog: { sections: [] } }, [], { purchase: [] }],
    },
  );

  function getBringApi(): BringAPI {
    if (!bringApiRef.current) {
      const { email, password } = getPreferenceValues<ExtensionPreferences>();
      const bringApi = new BringAPI(email, password);
      bringApiRef.current = bringApi;
    }
    return bringApiRef.current;
  }

  async function addToList(name: string, specification?: string): Promise<void> {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Adding ${name}` });
    try {
      const bringApi = bringApiRef.current;
      if (!bringApi) return;
      await mutate(bringApi.addItemToList(name), {
        optimisticUpdate: (data) => {
          const [catalog, customItems, list] = data as [Catalog, CustomItem[], List];
          return [catalog, customItems, { ...list, purchase: [...list.purchase, { name, specification }] }];
        },
      });
      toast.title = `Added ${name}`;
      toast.style = Toast.Style.Success;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not add ${name}`;
      toast.message = (error as Error).message;
    }
  }

  async function removeFromList(name: string): Promise<void> {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Removing ${name}` });
    try {
      const bringApi = bringApiRef.current;
      if (!bringApi) return;
      await mutate(bringApi.removeItemFromList(name), {
        optimisticUpdate: (data) => {
          const [catalog, customItems, list] = data as [Catalog, CustomItem[], List];
          return [
            catalog,
            customItems,
            {
              ...list,
              purchase: list.purchase.filter((item) => item.name !== name),
            },
          ];
        },
      });
      toast.title = `Removed ${name}`;
      toast.style = Toast.Style.Success;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not remove ${name}`;
      toast.message = (error as Error).message;
    }
  }

  const sections = getSections(catalog, customItems, list, search);

  return (
    <Grid
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      columns={6}
      onSearchTextChange={(text) => setSearch(text)}
      filtering={false}
    >
      {sections.map(({ name, items }) => (
        <Grid.Section key={name} title={name}>
          {items.map(({ name, image, fallback, isInPurchaseList }) => (
            <Grid.Item
              key={name}
              content={{
                value: { source: image, fallback, tintColor: Color.PrimaryText },
                tooltip: name,
              }}
              title={name}
              accessory={{
                icon: { source: Icon.CircleFilled, tintColor: isInPurchaseList ? ColorBringRed : ColorBringGreen },
              }}
              actions={
                <ActionPanel>
                  {isInPurchaseList ? (
                    <Action title="Remove From List" onAction={() => removeFromList(name)} />
                  ) : (
                    <Action title="Add to List" onAction={() => addToList(name)} />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}

function getSections(catalog: Catalog, customItems: CustomItem[], list: List, search: string): Section[] {
  let sections = catalog.catalog.sections.map((section) => ({
    name: section.name,
    sectionId: section.sectionId,
    items: section.items
      .filter(
        // remove item if there is a custom item with the same name and another section name
        ({ itemId }) =>
          !customItems.find((customItem) => customItem.itemId === itemId && customItem.userSectionId !== section.name),
      )
      .map(({ itemId, name }) => ({
        name,
        image: getImageUrl(itemId),
        fallback: getFallbackChar(name),
        isInPurchaseList: list.purchase.some((p) => p.name === name),
      })),
  }));

  sections = addCustomItemsToSections(sections, customItems, list);

  // add new item if search is not empty and no item matches the search exactly
  if (
    search.length > 0 &&
    !sections.some((section) => section.items.find((item) => item.name.toLowerCase() === search.toLowerCase()))
  ) {
    sections.push({
      name: "New Item",
      sectionId: "New Item",
      items: [
        {
          name: search,
          image: getImageUrl(search),
          fallback: getFallbackChar(search),
          isInPurchaseList: false,
        },
      ],
    });
  }

  sections = sections.map((section) => ({
    ...section,
    items: section.items
      .filter((item) => search.length === 0 || item.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return sections;
}

function addCustomItemsToSections(sections: Section[], customItems: CustomItem[], list: List): Section[] {
  // go through all custom items and replace items when they have matching section and name
  customItems.forEach((customItem) => {
    const section = sections.find((section) => section.sectionId === customItem.userSectionId);
    const item = section?.items.find((item) => item.name === customItem.itemId);
    if (item) {
      // replace item
      item.image = customItem.userIconItemId ? getImageUrl(customItem.userIconItemId) : getImageUrl(customItem.itemId);
    } else if (section) {
      // add item in exiting section
      section?.items.push({
        name: customItem.itemId,
        image: customItem.userIconItemId ? getImageUrl(customItem.userIconItemId) : getImageUrl(customItem.itemId),
        fallback: getFallbackChar(customItem.itemId),
        isInPurchaseList: list.purchase.some((p) => p.name === customItem.itemId),
      });
    } else {
      // find or create the custom section
      let customSection = sections.find((section) => section.sectionId === "custom");
      if (!customSection) {
        customSection = {
          name: "Custom",
          sectionId: "custom",
          items: [],
        };
        sections.push(customSection);
      }

      // add item in custom section
      customSection?.items.push({
        name: customItem.itemId,
        image: customItem.userIconItemId ? getImageUrl(customItem.userIconItemId) : getImageUrl(customItem.itemId),
        fallback: getFallbackChar(customItem.itemId),
        isInPurchaseList: list.purchase.some((p) => p.name === customItem.itemId),
      });
    }
  });

  return sections;
}
