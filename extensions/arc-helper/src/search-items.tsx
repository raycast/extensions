import { ActionPanel, Action, List, Detail, Icon, Color, Cache, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import { API, Item, PaginatedResponse, getRarityColor } from "./api";
import { getBlueprintStore, toggleBlueprintObtained, BlueprintStore } from "./storage";

// Clear stale cache on first load (v2 - server-side search)
const cache = new Cache();
const CACHE_VERSION = "v2";
if (cache.get("version") !== CACHE_VERSION) {
  cache.clear();
  cache.set("version", CACHE_VERSION);
}

const ITEM_TYPES = [
  "Advanced Material",
  "Blueprint",
  "Consumable",
  "Gadget",
  "Key",
  "Misc",
  "Modification",
  "Nature",
  "Quick Use",
  "Recyclable",
  "Refined Material",
  "Throwable",
  "Topside Material",
  "Trinket",
  "Weapon",
];

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
  const [blueprintStore, setBlueprintStore] = useState<BlueprintStore>({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Load blueprint store
  useEffect(() => {
    getBlueprintStore().then(setBlueprintStore);
  }, [refreshKey]);

  const handleToggleBlueprintObtained = useCallback(async (id: string, name: string) => {
    const newStatus = await toggleBlueprintObtained(id);
    setRefreshKey((k) => k + 1);
    await showToast({
      style: Toast.Style.Success,
      title: newStatus ? "Marked as Obtained" : "Marked as Needed",
      message: name,
    });
  }, []);

  const { isLoading, data, pagination } = useFetch(
    (options) => {
      const params = new URLSearchParams();
      params.set("page", String(options.page + 1));
      if (searchText) params.set("search", searchText);
      if (itemType !== "all") params.set("item_type", itemType);
      return `${API.items}?${params.toString()}`;
    },
    {
      mapResult(result: PaginatedResponse<Item>) {
        return {
          data: result.data,
          hasMore: result.pagination?.hasNextPage ?? false,
        };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search items..."
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle
      pagination={pagination}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Type" value={itemType} onChange={setItemType}>
          <List.Dropdown.Item title="All Types" value="all" />
          <List.Dropdown.Section title="Item Types">
            {ITEM_TYPES.map((type) => (
              <List.Dropdown.Item key={type} title={type} value={type} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {data.map((item) => {
        const isBlueprint = item.item_type === "Blueprint";
        const blueprintStatus = isBlueprint ? blueprintStore[item.id] : null;
        const isObtained = blueprintStatus?.obtained || false;

        return (
          <List.Item
            key={item.id}
            icon={{ source: item.icon, fallback: Icon.Box }}
            title={item.name}
            subtitle={item.item_type}
            accessories={[
              ...(isBlueprint
                ? [
                    {
                      icon: isObtained ? Icon.CheckCircle : Icon.Circle,
                      tooltip: isObtained ? "Obtained" : "Needed",
                    },
                  ]
                : []),
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
                {isBlueprint && (
                  <Action
                    title={isObtained ? "Mark as Needed" : "Mark as Obtained"}
                    icon={isObtained ? Icon.Circle : Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => handleToggleBlueprintObtained(item.id, item.name)}
                  />
                )}
                <Action.OpenInBrowser url={`https://metaforge.app/arc-raiders/items/${item.id}`} />
                <Action.CopyToClipboard title="Copy Item Name" content={item.name} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
