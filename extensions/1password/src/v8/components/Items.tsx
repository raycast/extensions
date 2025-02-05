import { Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import { Categories, DEFAULT_CATEGORY } from "./Categories";
import { Item } from "../types";
import {
  getCategoryIcon,
  actionsForItem,
  useAccount,
  CommandLineMissingError,
  ConnectionError,
  ExtensionError,
  usePasswords2,
} from "../utils";
import { Error as ErrorGuide } from "./Error";
import { ItemActionPanel } from "./ItemActionPanel";
import { useMemo, useState } from "react";

export function Items({ flags }: { flags?: string[] }) {
  const [category, setCategory] = useCachedState<string>("selected_category", DEFAULT_CATEGORY);
  const [passwords, setPasswords] = useState<Item[]>([]);

  const { data: account, error: accountError, isLoading: accountIsLoading } = useAccount();
  const {
    data: items,
    error: itemsError,
    isLoading: itemsIsLoading,
  } = usePasswords2({ flags, account: account?.account_uuid ?? "", execute: !accountError && !accountIsLoading });

  useMemo(() => {
    if (!items) return;
    if (category === DEFAULT_CATEGORY) return setPasswords(items);
    setPasswords(items?.filter((item) => item.category === category.replaceAll(" ", "_").toUpperCase()));
  }, [items, category]);

  const onCategoryChange = (newCategory: string) => {
    category !== newCategory && setCategory(newCategory);
  };

  if (itemsError instanceof CommandLineMissingError || accountError instanceof CommandLineMissingError)
    return <ErrorGuide />;

  if (itemsError instanceof ConnectionError || accountError instanceof ConnectionError) {
    return (
      <List>
        <List.EmptyView
          title={(itemsError as ExtensionError)?.title || (accountError as ExtensionError)?.title}
          description={itemsError?.message || accountError?.message}
          icon={Icon.WifiDisabled}
        />
      </List>
    );
  }

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
      <List.Section title="Items" subtitle={`${passwords?.length}`}>
        {passwords?.length
          ? passwords.map((item) => (
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
                keywords={item.additional_information ? [item.additional_information] : []}
                actions={<ItemActionPanel account={account} item={item} actions={actionsForItem(item)} />}
              />
            ))
          : null}
      </List.Section>
    </List>
  );
}
