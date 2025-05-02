import { List, Action, ActionPanel, Keyboard } from "@raycast/api";
import { useSearchResults, useSearchCategories, CategoryOption } from "./hooks/useDocSearch";
import { useState } from "react";

function CategoryDropdown(props: { categories: CategoryOption[]; onCategoryChange: (newValue: string) => void }) {
  const { categories, onCategoryChange } = props;

  return (
    <List.Dropdown
      tooltip="Select Category"
      storeValue={true}
      onChange={(newValue) => {
        onCategoryChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Content Categories">
        {categories.map((category) => (
          <List.Dropdown.Item
            key={category.id}
            title={category.count ? `${category.name} (${category.count.toLocaleString()})` : category.name}
            value={category.id}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

const Command = () => {
  const [query, setQuery] = useState<string>("");
  const { categoryOptions } = useSearchCategories(query);
  const [category, setCategory] = useState<string>("");
  const { data, isLoading, pagination } = useSearchResults(query, category);

  return (
    <List
      throttle
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Shopify documentation..."
      searchBarAccessory={
        <CategoryDropdown categories={categoryOptions} onCategoryChange={(newId) => setCategory(newId)} />
      }
      pagination={pagination}
      isShowingDetail
    >
      {data.map((item) => (
        <List.Item
          key={item.url + item.gid}
          icon={item.icon}
          title={item.title}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://shopify.dev${item.url}`} shortcut={Keyboard.Shortcut.Common.Open} />
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={item.markdown}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title={item.pretty_breadcrumbs || ""} />
                  <List.Item.Detail.Metadata.Label title="Type" text={item.object_label || "N/A"} />
                  <List.Item.Detail.Metadata.Label title="Category" text={item.content_category || "N/A"} />
                  <List.Item.Detail.Metadata.Label title="API Version" text={item.version || "N/A"} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
};

export default Command;
