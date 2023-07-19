import { Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { Categories, DEFAULT_CATEGORY } from "./Categories";
import { ChangeCurrentAccount, Item, User } from "../types";
import { getCategoryIcon, useOp, actionsForItem, cacheKeyForItemsAccountId } from "../utils";
import { Guide } from "./Guide";
import { ItemActionPanel } from "./ItemActionPanel";

export function Items({
  accountId,
  account,
  changeCurrentAccount,
}: {
  accountId: string;
  account: User;
  changeCurrentAccount: ChangeCurrentAccount;
}) {
  const [category, setCategory] = useCachedState<string>("selected_category", DEFAULT_CATEGORY);

  const {
    data: items,
    error: itemsError,
    isLoading: itemsIsLoading,
  } = useOp<Item[]>(accountId, ["item", "list", "--long"], cacheKeyForItemsAccountId(accountId));

  const categoryItems =
    category === DEFAULT_CATEGORY
      ? items
      : items?.filter((item) => item.category === category.replaceAll(" ", "_").toUpperCase());
  const onCategoryChange = (newCategory: string) => {
    category !== newCategory && setCategory(newCategory);
  };

  if (itemsError) return <Guide />;
  return (
    <List
      navigationTitle={`${account.url}`}
      searchBarAccessory={<Categories accountId={accountId} onCategoryChange={onCategoryChange} />}
      isLoading={itemsIsLoading}
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
                actions={
                  <ItemActionPanel
                    account={account}
                    item={item}
                    actions={actionsForItem(item)}
                    changeCurrentAccount={changeCurrentAccount}
                  />
                }
              />
            ))}
      </List.Section>
    </List>
  );
}
