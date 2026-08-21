import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

interface ItemRecord {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  url: string;
  updatedAt: string;
}

async function fetchItems(filterCategory: string): Promise<ItemRecord[]> {
  // Replace with actual API or local service call
  return [
    {
      id: "1",
      title: "Sample Task One",
      subtitle: "High Priority",
      category: "engineering",
      url: "https://github.com",
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "Design System Review",
      subtitle: "Pending Feedback",
      category: "design",
      url: "https://figma.com",
      updatedAt: new Date().toISOString(),
    },
  ];
}

export default function Command() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: items, isLoading, revalidate } = useCachedPromise(
    async (category: string) => {
      const allItems = await fetchItems(category);
      if (category === "all") return allItems;
      return allItems.filter((item) => item.category === category);
    },
    [selectedCategory]
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search items..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          value={selectedCategory}
          onChange={(newValue) => setSelectedCategory(newValue)}
        >
          <List.Dropdown.Item title="All Categories" value="all" />
          <List.Dropdown.Item title="Engineering" value="engineering" />
          <List.Dropdown.Item title="Design" value="design" />
        </List.Dropdown>
      }
    >
      <List.Section title="Results" subtitle={`${items?.length ?? 0} items`}>
        {items?.map((item) => (
          <List.Item
            key={item.id}
            id={item.id}
            icon={{ source: Icon.Circle, tintColor: Color.Blue }}
            title={item.title}
            subtitle={item.subtitle}
            accessories={[
              { tag: { value: item.category, color: Color.Purple } },
              { date: new Date(item.updatedAt) },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={item.url} />
                  <Action.CopyToClipboard title="Copy Link" content={item.url} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh List"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No items found"
        description="Try changing the category filter or search terms."
      />
    </List>
  );
}
