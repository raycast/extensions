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

export function Items({ flags }: { flags?: string[] }) {
  const [category, setCategory] = useCachedState<string>("selected_category", DEFAULT_CATEGORY);
  const [passwords, setPasswords] = useState<Item[]>([]);
  const { data: account, error: accountError, isLoading: accountIsLoading } = useAccount();
  const {
    data: items,
    error: itemsError,
    isLoading: itemsIsLoading,
  } = usePasswords2({ account: account?.account_uuid ?? "", execute: !accountError && !accountIsLoading, flags });

  useMemo(() => {
    if (!items) return;
    if (category === DEFAULT_CATEGORY) return setPasswords(items);
    setPasswords(items?.filter((item) => item.category === category.replaceAll(" ", "_").toUpperCase()));
  }, [items, category]);

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
      isLoading={itemsIsLoading || accountIsLoading}
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
                keywords={item.additional_information ? [item.additional_information] : []}
                subtitle={item.additional_information}
                title={item.title}
              />
            ))
          : null}
      </List.Section>
    </List>
  );
}
