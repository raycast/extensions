import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { CopyToClipboard } from "./ActionCopyToClipboard";
import { Categories, DEFAULT_CATEGORY } from "./Categories";
import { Item, Url, User } from "../types";
import { getCategoryIcon, ITEMS_CACHE_NAME, ACCOUNT_CACHE_NAME, useOp } from "../utils";
import { Guide } from "./Guide";

export function Items() {
  const [category, setCategory] = useCachedState<string>("selected_category", DEFAULT_CATEGORY);

  const {
    data: account,
    error: accountError,
    isLoading: accountIsLoading,
  } = useOp<User>(["whoami"], ACCOUNT_CACHE_NAME);
  const {
    data: items,
    error: itemsError,
    isLoading: itemsIsLoading,
  } = useOp<Item[]>(["item", "list", "--long"], ITEMS_CACHE_NAME);

  const categoryItems =
    category === DEFAULT_CATEGORY
      ? items
      : items?.filter((item) => item.category === category.replaceAll(" ", "_").toUpperCase());
  const onCategoryChange = (newCategory: string) => {
    category !== newCategory && setCategory(newCategory);
  };

  if (itemsError || accountError) return <Guide />;
  return (
    <List
      searchBarAccessory={<Categories onCategoryChange={onCategoryChange} />}
      isLoading={itemsIsLoading || accountIsLoading}
    >
      {categoryItems?.length ? (
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
                <ActionPanel>
                  <Action.Open
                    title="Open In 1Password"
                    target={`onepassword://view-item/?a=${account?.account_uuid}&v=${item.vault.id}&i=${item.id}`}
                    application="com.1password.1password"
                  />
                  {item.category === "LOGIN" && (
                    <>
                      {item?.urls?.filter((url) => url.primary).length ? (
                        <Action.OpenInBrowser
                          title="Open In Browser"
                          url={(item.urls.find((url) => url.primary) as Url).href}
                        />
                      ) : null}
                      <ActionPanel.Section>
                        <CopyToClipboard
                          id={item.id}
                          vault_id={item.vault.id}
                          field="username"
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                        <CopyToClipboard
                          id={item.id}
                          vault_id={item.vault.id}
                          field="password"
                          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                        />
                      </ActionPanel.Section>
                    </>
                  )}
                </ActionPanel>
              }
            />
          ))
      ) : (
        <List.EmptyView
          title="No items found"
          description="Any items you have added in 1Password app will be listed here."
        />
      )}
    </List>
  );
}
