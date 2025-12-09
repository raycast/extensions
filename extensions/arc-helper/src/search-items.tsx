import { ActionPanel, Action, List, Detail, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useMemo } from "react";
import { API, Item, PaginatedResponse, getRarityColor } from "./api";

function ItemDetail({ item }: { item: Item }) {
  const stats = item.stat_block || {};
  const relevantStats = Object.entries(stats).filter(([, value]) => value !== 0 && value !== "" && value !== null);

  const markdown = `
# ${item.name}

![Icon](${item.icon})

${item.description || "No description available."}

${item.flavor_text ? `> ${item.flavor_text}` : ""}

---

## Details

| Property | Value |
|----------|-------|
| **Type** | ${item.item_type} |
| **Rarity** | ${item.rarity} |
| **Value** | ${item.value} |
${item.workbench ? `| **Workbench** | ${item.workbench} |` : ""}
${item.loot_area ? `| **Loot Area** | ${item.loot_area} |` : ""}
${item.ammo_type ? `| **Ammo Type** | ${item.ammo_type} |` : ""}
${item.loadout_slots?.length ? `| **Loadout Slots** | ${item.loadout_slots.join(", ")} |` : ""}

${
  relevantStats.length > 0
    ? `
## Stats

| Stat | Value |
|------|-------|
${relevantStats.map(([key, value]) => `| ${formatStatName(key)} | ${value} |`).join("\n")}
`
    : ""
}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Type" text={item.item_type} />
          <Detail.Metadata.TagList title="Rarity">
            <Detail.Metadata.TagList.Item text={item.rarity} color={getRarityColor(item.rarity)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Value" text={String(item.value)} />
          {item.workbench && <Detail.Metadata.Label title="Workbench" text={item.workbench} />}
          {item.loot_area && <Detail.Metadata.Label title="Loot Area" text={item.loot_area} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="MetaForge"
            target={`https://metaforge.app/arc-raiders/items/${item.id}`}
            text="View on MetaForge"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://metaforge.app/arc-raiders/items/${item.id}`} />
          <Action.CopyToClipboard title="Copy Item Name" content={item.name} />
        </ActionPanel>
      }
    />
  );
}

function formatStatName(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export default function SearchItems() {
  const [searchText, setSearchText] = useState("");
  const [itemType, setItemType] = useState<string>("all");

  const { isLoading, data, pagination } = useFetch((options) => `${API.items}?page=${options.page + 1}`, {
    mapResult(result: PaginatedResponse<Item>) {
      return {
        data: result.data,
        hasMore: result.pagination.hasNextPage,
      };
    },
    keepPreviousData: true,
    initialData: [],
  });

  const items = data || [];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchText === "" ||
        item.name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchText.toLowerCase());
      const matchesType = itemType === "all" || item.item_type === itemType;
      return matchesSearch && matchesType;
    });
  }, [items, searchText, itemType]);

  const itemTypes = useMemo(() => {
    return [...new Set(items.map((item) => item.item_type))].sort();
  }, [items]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search items..."
      filtering={false}
      onSearchTextChange={setSearchText}
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Type" value={itemType} onChange={setItemType}>
          <List.Dropdown.Item title="All Types" value="all" />
          <List.Dropdown.Section title="Item Types">
            {itemTypes.map((type) => (
              <List.Dropdown.Item key={type} title={type} value={type} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {filteredItems.map((item) => (
        <List.Item
          key={item.id}
          icon={{ source: item.icon, fallback: Icon.Box }}
          title={item.name}
          subtitle={item.item_type}
          accessories={[
            {
              tag: {
                value: item.rarity,
                color: getRarityColor(item.rarity) as Color,
              },
            },
            { text: `${item.value}` },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<ItemDetail item={item} />} />
              <Action.OpenInBrowser url={`https://metaforge.app/arc-raiders/items/${item.id}`} />
              <Action.CopyToClipboard title="Copy Item Name" content={item.name} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
