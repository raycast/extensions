import { Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";

import { Item } from "../types";
import {
  actionsForItem,
  CommandLineMissingError,
  ConnectionError,
  ExtensionError,
  getCategoryIcon,
  useAccount,
  usePasswords2,
} from "../utils";
import { Categories, DEFAULT_CATEGORY } from "./Categories";
import { Error as ErrorGuide } from "./Error";
import { ItemActionPanel } from "./ItemActionPanel";

function getSearchableStrings(item: Item): string[] {
  const strings = [item.title];
  if (item.additional_information) strings.push(item.additional_information);
  if (item.urls) {
    for (const url of item.urls) {
      try {
        strings.push(new URL(url.href).hostname);
      } catch {
        strings.push(url.href);
      }
    }
  }
  if (item.vault?.name) strings.push(item.vault.name);
  return strings;
}

function matchesSearch(item: Item, query: string): boolean {
  if (!query) return true;
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const searchable = getSearchableStrings(item).map((s) => s.toLowerCase());
  return tokens.every((token) => searchable.some((s) => s.includes(token)));
}

export function Items({ flags }: { flags?: string[] }) {
  const [category, setCategory] = useCachedState<string>("selected_category", DEFAULT_CATEGORY);
  const [searchText, setSearchText] = useState("");
  const [passwords, setPasswords] = useState<Item[]>([]);
  const { data: account, error: accountError, isLoading: accountIsLoading } = useAccount();
  const {
    data: items,
    error: itemsError,
    isLoading: itemsIsLoading,
  } = usePasswords2({ account: account?.account_uuid ?? "", execute: !accountError && !accountIsLoading, flags });

  useMemo(() => {
    if (!items) return;
    const byCategory =
      category === DEFAULT_CATEGORY
        ? items
        : items.filter((item) => item.category === category.replaceAll(" ", "_").toUpperCase());
    setPasswords(byCategory.filter((item) => matchesSearch(item, searchText)));
  }, [items, category, searchText]);

  const onCategoryChange = (newCategory: string) => {
    if (category !== newCategory) setCategory(newCategory);
  };

  if (itemsError instanceof CommandLineMissingError || accountError instanceof CommandLineMissingError)
    return <ErrorGuide />;

  if (itemsError instanceof ConnectionError || accountError instanceof ConnectionError) {
    return (
      <List>
        <List.EmptyView
          description={itemsError?.message || accountError?.message}
          icon={Icon.WifiDisabled}
          title={(itemsError as ExtensionError)?.title || (accountError as ExtensionError)?.title}
        />
      </List>
    );
  }

  return (
    <List
      filtering={false}
      isLoading={itemsIsLoading || accountIsLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={<Categories onCategoryChange={onCategoryChange} />}
    >
      <List.EmptyView
        description="Any items you have added in 1Password app will be listed here."
        icon="1password-noview.png"
        title="No items found"
      />
      <List.Section subtitle={`${passwords?.length}`} title="Items">
        {passwords?.length
          ? passwords.map((item) => (
              <List.Item
                accessories={[
                  item?.favorite
                    ? { icon: { source: Icon.Stars, tintColor: Color.Yellow }, tooltip: "Favorite item" }
                    : {},
                  { text: item.vault?.name },
                ]}
                actions={<ItemActionPanel account={account} actions={actionsForItem(item)} item={item} />}
                icon={{
                  tooltip: item.category,
                  value: { source: getCategoryIcon(item.category), tintColor: Color.Blue },
                }}
                id={item.id}
                key={item.id}
                subtitle={item.additional_information}
                title={item.title}
              />
            ))
          : null}
      </List.Section>
    </List>
  );
}
