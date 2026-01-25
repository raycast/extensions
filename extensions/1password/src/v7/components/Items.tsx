import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import crypto from "crypto";

import resetCache from "../../reset-cache";
import { CategoryName } from "../types";
import { getV7CategoryIcon, getV7Items } from "../utils";
import { Categories, DEFAULT_CATEGORY } from "./Categories";

export function Items() {
  const [category, setCategory] = useCachedState<string>("selected_category", DEFAULT_CATEGORY);
  const categoriesObj = getV7Items();
  const categories =
    categoriesObj && category === DEFAULT_CATEGORY
      ? Object.values(categoriesObj).sort((a, b) => a.name.localeCompare(b.name))
      : categoriesObj && [categoriesObj[category]];
  const onCategoryChange = (newCategory: string) => {
    if (category !== newCategory) setCategory(newCategory);
  };

  return (
    <List searchBarAccessory={<Categories onCategoryChange={onCategoryChange} />}>
      {categories?.length ? (
        categories.map((category) => (
          <List.Section id={category.id} key={category.id} title={category.name}>
            {category.items.map((item) => (
              <List.Item
                accessories={[{ text: item.vaultName }]}
                actions={
                  <ActionPanel>
                    {item.categoryUUID === "001" && item.websiteURLs?.length && (
                      <Action.Open
                        application="com.agilebits.onepassword7"
                        icon={Icon.Globe}
                        target={`onepassword7://open_and_fill/${item.vaultUUID}/${item.uuid}/${crypto
                          .createHash("sha256")
                          .update(item.websiteURLs[0] as string)
                          .digest("hex")}`}
                        title="Open in Browser"
                      />
                    )}
                    <Action.Open
                      application="com.agilebits.onepassword7"
                      target={`onepassword7://view/${item.vaultUUID}/${item.uuid}`}
                      title="Open in 1Password"
                    />
                    <Action.Open
                      application="com.agilebits.onepassword7"
                      shortcut={{ key: "e", modifiers: ["cmd"] }}
                      target={`onepassword7://edit/${item.vaultUUID}/${item.uuid}`}
                      title="Edit in 1Password"
                    />
                    <ActionPanel.Section>
                      <Action icon={Icon.Trash} onAction={() => resetCache()} title="Reset Cache"></Action>
                    </ActionPanel.Section>
                  </ActionPanel>
                }
                icon={{
                  tooltip: item.categorySingularName,
                  value: {
                    source: getV7CategoryIcon(
                      item.categorySingularName.replaceAll(" ", "_").toUpperCase() as CategoryName,
                    ),
                    tintColor: Color.Blue,
                  },
                }}
                id={item.uuid}
                key={item.uuid}
                keywords={item.accountName ? [item.accountName] : []}
                subtitle={item.accountName}
                title={item.itemTitle}
              />
            ))}
          </List.Section>
        ))
      ) : (
        <List.EmptyView
          description="Any items you have added in 1Password app will be listed here."
          title="No items found"
        />
      )}
    </List>
  );
}
