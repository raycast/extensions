import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

import crypto from "crypto";

import { Categories, DEFAULT_CATEGORY } from "./Categories";
import { CategoryName } from "../types";
import { getV7Items, getV7CategoryIcon } from "../utils";
import resetCache from "../../reset-cache";

export function Items() {
  const [category, setCategory] = useCachedState<string>("selected_category", DEFAULT_CATEGORY);

  const categoriesObj = getV7Items();

  const categories =
    categoriesObj && category === DEFAULT_CATEGORY
      ? Object.values(categoriesObj).sort((a, b) => a.name.localeCompare(b.name))
      : categoriesObj && [categoriesObj[category]];

  const onCategoryChange = (newCategory: string) => {
    category !== newCategory && setCategory(newCategory);
  };

  return (
    <List searchBarAccessory={<Categories onCategoryChange={onCategoryChange} />}>
      {categories?.length ? (
        categories.map((category) => (
          <List.Section key={category.id} id={category.id} title={category.name}>
            {category.items.map((item) => (
              <List.Item
                key={item.uuid}
                id={item.uuid}
                icon={{
                  value: {
                    source: getV7CategoryIcon(
                      item.categorySingularName.replaceAll(" ", "_").toUpperCase() as CategoryName,
                    ),
                    tintColor: Color.Blue,
                  },
                  tooltip: item.categorySingularName,
                }}
                title={item.itemTitle}
                subtitle={item.accountName}
                accessories={[{ text: item.vaultName }]}
                keywords={item.accountName ? [item.accountName] : []}
                actions={
                  <ActionPanel>
                    {item.categoryUUID === "001" && item.websiteURLs?.length && (
                      <Action.Open
                        icon={Icon.Globe}
                        title="Open in Browser"
                        target={`onepassword7://open_and_fill/${item.vaultUUID}/${item.uuid}/${crypto
                          .createHash("sha256")
                          .update(item.websiteURLs[0] as string)
                          .digest("hex")}`}
                        application="com.agilebits.onepassword7"
                      />
                    )}
                    <Action.Open
                      // eslint-disable-next-line @raycast/prefer-title-case
                      title="Open in 1Password"
                      target={`onepassword7://view/${item.vaultUUID}/${item.uuid}`}
                      application="com.agilebits.onepassword7"
                    />
                    <Action.Open
                      // eslint-disable-next-line @raycast/prefer-title-case
                      title="Edit in 1Password"
                      target={`onepassword7://edit/${item.vaultUUID}/${item.uuid}`}
                      application="com.agilebits.onepassword7"
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                    <ActionPanel.Section>
                      <Action title="Reset Cache" icon={Icon.Trash} onAction={() => resetCache()}></Action>
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
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
