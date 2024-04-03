import { Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { Categories, DEFAULT_CATEGORY } from "./Categories";
import { Item, User } from "../types";
import { getCategoryIcon, ITEMS_CACHE_NAME, ACCOUNT_CACHE_NAME, actionsForItem, useCachedOp } from "../utils";
import { Guide } from "./Guide";
import { ItemActionPanel } from "./ItemActionPanel";
import { useEffect } from "react";

export function Items() {
  const [category, setCategory] = useCachedState<string>("selected_category", DEFAULT_CATEGORY);
  const [categoryItems, setCategoryItems] = useCachedState<Item[]>("category_items", []);

  const {
    data: account,
    error: accountError,
    isLoading: accountIsLoading,
  } = useCachedOp<User>(["whoami"], ACCOUNT_CACHE_NAME);
  const {
    data: items,
    error: itemsError,
    isLoading: itemsIsLoading,
  } = useCachedOp<Item[]>(["item", "list", "--long"], ITEMS_CACHE_NAME);

  useEffect(() => {
    if (!items) return;
    if (category === DEFAULT_CATEGORY) {
      setCategoryItems(items);
    } else {
      setCategoryItems(items?.filter((item) => item.category === category.replaceAll(" ", "_").toUpperCase()));
    }
  }, [items]);

  const onCategoryChange = (newCategory: string) => {
    category !== newCategory && setCategory(newCategory);
  };

  if (itemsError || accountError) return <Guide />;
  return (
    <List
      searchBarAccessory={<Categories onCategoryChange={onCategoryChange} />}
      isLoading={itemsIsLoading || accountIsLoading}
    >
      <List.EmptyView
        title="No items found"
        icon="1password-noview.png"
        description="Any items you have added in 1Password app will be listed here."
      />
      <List.Section title="Items" subtitle={`${categoryItems?.length}`}>
        {categoryItems?.length &&
          categoryItems
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((item) => (
              <List.Item
                key={item.id}
                id={item.id}
                icon={{
                  value: { source: getCategoryIcon(item.category), tintColor: Color.Blue },
                  tooltip: item.category,
                }}
                title={item.title}
                subtitle={item.additional_information}
                accessories={[
                  item?.favorite
                    ? { icon: { source: Icon.Stars, tintColor: Color.Yellow }, tooltip: "Favorite item" }
                    : {},
                  { text: item.vault?.name },
                ]}
                actions={<ItemActionPanel account={account} item={item} actions={actionsForItem(item)} />}
              />
            ))}
      </List.Section>
    </List>
  );
}
