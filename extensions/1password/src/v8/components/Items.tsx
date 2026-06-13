import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
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

const MAX_LIGHTWEIGHT_RENDERED_ITEMS = 200;
const URL_HOSTNAME_REGEX = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n?]+)/i;
const preferences = getPreferenceValues<ExtensionPreferences>();

function getHostname(href: string, useLightweightParser: boolean): string {
  if (useLightweightParser) {
    return href.match(URL_HOSTNAME_REGEX)?.[1] ?? href;
  }

  try {
    return new URL(href).hostname;
  } catch {
    return href;
  }
}

function matchesValue(value: string | undefined, token: string): boolean {
  return value?.toLowerCase().includes(token) ?? false;
}

function matchesSearch(item: Item, query: string, useLightweightUrlParser: boolean): boolean {
  if (!query) return true;
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.every((token) => {
    if (
      matchesValue(item.title, token) ||
      matchesValue(item.additional_information, token) ||
      matchesValue(item.vault?.name, token)
    ) {
      return true;
    }

    return item.urls?.some((url) => matchesValue(getHostname(url.href, useLightweightUrlParser), token)) ?? false;
  });
}

export function Items({ flags }: { flags?: string[] }) {
  const [category, setCategory] = useCachedState<string>("selected_category", DEFAULT_CATEGORY);
  const [searchText, setSearchText] = useState("");
  const reduceItemListMemoryUsage = preferences.reduceItemListMemoryUsage;
  const { data: account, error: accountError, isLoading: accountIsLoading } = useAccount();
  const {
    data: items,
    error: itemsError,
    isLoading: itemsIsLoading,
  } = usePasswords2({ account: account?.account_uuid ?? "", execute: !accountError && !accountIsLoading, flags });

  const passwords = useMemo(() => {
    if (!items) return [];
    const byCategory =
      category === DEFAULT_CATEGORY
        ? items
        : items.filter((item) => item.category === category.replaceAll(" ", "_").toUpperCase());
    return byCategory.filter((item) => matchesSearch(item, searchText, reduceItemListMemoryUsage));
  }, [items, category, searchText, reduceItemListMemoryUsage]);

  const visiblePasswords = useMemo(
    () => (reduceItemListMemoryUsage ? passwords.slice(0, MAX_LIGHTWEIGHT_RENDERED_ITEMS) : passwords),
    [passwords, reduceItemListMemoryUsage],
  );
  const itemCountSubtitle =
    visiblePasswords.length < passwords.length
      ? `${visiblePasswords.length} of ${passwords.length}`
      : `${passwords.length}`;

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
      <List.Section subtitle={itemCountSubtitle} title="Items">
        {visiblePasswords.length
          ? visiblePasswords.map((item) => (
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
