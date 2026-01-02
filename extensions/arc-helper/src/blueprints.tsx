import { ActionPanel, Action, List, Detail, Icon, Color, Cache, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import { API, Item, PaginatedResponse, getRarityColor } from "./api";
import { getBlueprintStore, toggleBlueprintObtained, adjustBlueprintDuplicates, BlueprintStore } from "./storage";

// Clear stale cache on first load (v1 - server-side search)
const cache = new Cache({ namespace: "blueprints" });
const CACHE_VERSION = "v1";
if (cache.get("version") !== CACHE_VERSION) {
  cache.clear();
  cache.set("version", CACHE_VERSION);
}

type FilterMode = "all" | "needed" | "obtained";

function BlueprintDetail({ item, status }: { item: Item; status: { obtained: boolean; duplicates: number } | null }) {
  const markdown = `
# ${item.name}

![Icon](${item.icon})

${item.description || "No description available."}

${item.flavor_text ? `> ${item.flavor_text}` : ""}

---

## Collection Status

| Status | Value |
|--------|-------|
| **Obtained** | ${status?.obtained ? "Yes" : "No"} |
| **Duplicates** | ${status?.duplicates || 0} |

---

## Details

| Property | Value |
|----------|-------|
| **Rarity** | ${item.rarity} |
| **Value** | ${item.value} |
${item.loot_area ? `| **Loot Area** | ${item.loot_area} |` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={status?.obtained ? "Obtained" : "Needed"}
              color={status?.obtained ? Color.Green : Color.Orange}
            />
          </Detail.Metadata.TagList>
          {(status?.duplicates || 0) > 0 && (
            <Detail.Metadata.Label title="Duplicates" text={String(status?.duplicates)} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Rarity">
            <Detail.Metadata.TagList.Item text={item.rarity} color={getRarityColor(item.rarity)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Value" text={String(item.value)} />
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
          <Action.CopyToClipboard title="Copy Blueprint Name" content={item.name} />
        </ActionPanel>
      }
    />
  );
}

export default function Blueprints() {
  const [searchText, setSearchText] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [blueprintStore, setBlueprintStore] = useState<BlueprintStore>({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch all blueprints
  const { isLoading, data, pagination } = useFetch(
    (options) => {
      const params = new URLSearchParams();
      params.set("page", String(options.page + 1));
      params.set("item_type", "Blueprint");
      if (searchText) params.set("search", searchText);
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

  // Load blueprint store
  useEffect(() => {
    getBlueprintStore().then(setBlueprintStore);
  }, [refreshKey]);

  const handleToggleObtained = useCallback(async (id: string, name: string) => {
    const newStatus = await toggleBlueprintObtained(id);
    setRefreshKey((k) => k + 1);
    await showToast({
      style: Toast.Style.Success,
      title: newStatus ? "Marked as Obtained" : "Marked as Needed",
      message: name,
    });
  }, []);

  const handleAddDuplicate = useCallback(async (id: string, name: string) => {
    const newCount = await adjustBlueprintDuplicates(id, 1);
    setRefreshKey((k) => k + 1);
    await showToast({
      style: Toast.Style.Success,
      title: "Added Duplicate",
      message: `${name} (${newCount} total)`,
    });
  }, []);

  const handleRemoveDuplicate = useCallback(async (id: string, name: string) => {
    const newCount = await adjustBlueprintDuplicates(id, -1);
    setRefreshKey((k) => k + 1);
    await showToast({
      style: Toast.Style.Success,
      title: "Removed Duplicate",
      message: `${name} (${newCount} total)`,
    });
  }, []);

  // Filter blueprints based on mode
  const filteredData = data.filter((item) => {
    const status = blueprintStore[item.id];
    if (filterMode === "obtained") return status?.obtained;
    if (filterMode === "needed") return !status?.obtained;
    return true;
  });

  // Calculate stats
  const obtainedCount = data.filter((item) => blueprintStore[item.id]?.obtained).length;
  const totalCount = data.length;
  const progressText = totalCount > 0 ? `${obtainedCount}/${totalCount}` : "";

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search blueprints..."
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle
      pagination={pagination}
      navigationTitle={progressText ? `Blueprints (${progressText})` : "Blueprints"}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filterMode} onChange={(v) => setFilterMode(v as FilterMode)}>
          <List.Dropdown.Item title="All Blueprints" value="all" />
          <List.Dropdown.Item title="Needed" value="needed" />
          <List.Dropdown.Item title="Obtained" value="obtained" />
        </List.Dropdown>
      }
    >
      {filteredData.map((item) => {
        const status = blueprintStore[item.id];
        const isObtained = status?.obtained || false;
        const duplicates = status?.duplicates || 0;

        return (
          <List.Item
            key={item.id}
            icon={{ source: item.icon, fallback: Icon.Document }}
            title={item.name}
            subtitle={duplicates > 0 ? `+${duplicates} duplicates` : undefined}
            accessories={[
              {
                icon: isObtained
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText },
                tooltip: isObtained ? "Obtained" : "Needed",
              },
              {
                tag: {
                  value: item.rarity,
                  color: getRarityColor(item.rarity) as Color,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={isObtained ? "Mark as Needed" : "Mark as Obtained"}
                    icon={isObtained ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => handleToggleObtained(item.id, item.name)}
                  />
                  <Action.Push
                    title="View Details"
                    icon={Icon.Eye}
                    target={<BlueprintDetail item={item} status={status || null} />}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Duplicates">
                  <Action
                    title="Add Duplicate"
                    icon={Icon.PlusCircle}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => handleAddDuplicate(item.id, item.name)}
                  />
                  {duplicates > 0 && (
                    <Action
                      title="Remove Duplicate"
                      icon={Icon.MinusCircle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={() => handleRemoveDuplicate(item.id, item.name)}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={`https://metaforge.app/arc-raiders/items/${item.id}`} />
                  <Action.CopyToClipboard title="Copy Blueprint Name" content={item.name} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
