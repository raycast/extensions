import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { CopyToClipboard } from "./ActionCopyToClipboard";
import { Categories, DEFAULT_CATEGORY } from "./Categories";
import { Item, Url, User } from "../types";
import { op, getCategoryIcon, ITEMS_CACHE_NAME, PROFILE_CACHE_NAME } from "../utils";

export function Items() {
  const [category, setCategory] = useCachedState<string>("selected_category", DEFAULT_CATEGORY);

  const items = op<Item[]>(ITEMS_CACHE_NAME, ["item", "list", "--long"]);
  const profile = op<User>(PROFILE_CACHE_NAME, ["whoami"]);

  const categoryItems =
    category === DEFAULT_CATEGORY
      ? items
      : items?.filter((item) => item.category === category.replaceAll(" ", "_").toUpperCase());

  const onCategoryChange = (newCategory: string) => {
    category !== newCategory && setCategory(newCategory);
  };

  return (
    <List searchBarAccessory={<Categories onCategoryChange={onCategoryChange} />}>
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
                    target={`onepassword://view-item/?a=${profile?.account_uuid}&v=${item.vault.id}&i=${item.id}`}
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
                      <CopyToClipboard
                        id={item.id}
                        vault_id={item.vault.id}
                        field="username"
                        shortcut={{ modifiers: ["cmd"], key: "u" }}
                      />
                      <CopyToClipboard
                        id={item.id}
                        vault_id={item.vault.id}
                        field="password"
                        shortcut={{ modifiers: ["cmd"], key: "p" }}
                      />
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
