import { ActionPanel, Action, Icon, Grid, showToast, Toast } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getUser } from "./api";
import { HabiticaUser } from "./types";
import { ASSET_BASE_URL } from "./constants";

type InventoryEntry = [key: string, count: number];

function buildInventoryEntries(record: Record<string, number> | undefined): InventoryEntry[] {
  return Object.entries(record ?? {})
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b)) as InventoryEntry[];
}

export default function Command() {
  const [user, setUser] = useState<HabiticaUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("all");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      setUser(await getUser());
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to load inventory", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const items = user?.items;

  const categories: { key: string; label: string; entries: InventoryEntry[]; imageUrl: (k: string) => string }[] = [
    {
      key: "eggs",
      label: "Eggs",
      entries: buildInventoryEntries(items?.eggs),
      imageUrl: (k) => `${ASSET_BASE_URL}Pet_Egg_${k}.png`,
    },
    {
      key: "potions",
      label: "Hatching Potions",
      entries: buildInventoryEntries(items?.hatchingPotions),
      imageUrl: (k) => `${ASSET_BASE_URL}Pet_HatchingPotion_${k}.png`,
    },
    {
      key: "food",
      label: "Food",
      entries: buildInventoryEntries(items?.food),
      imageUrl: (k) => `${ASSET_BASE_URL}Pet_Food_${k}.png`,
    },
    {
      key: "special",
      label: "Special",
      entries: buildInventoryEntries(items?.special),
      imageUrl: (k) => `${ASSET_BASE_URL}shop_${k}.png`,
    },
    {
      key: "quests",
      label: "Quests",
      entries: buildInventoryEntries(items?.quests),
      imageUrl: (k) => `${ASSET_BASE_URL}inventory_quest_scroll_${k}.png`,
    },
  ];

  const visibleCategories = category === "all" ? categories : categories.filter((c) => c.key === category);
  const isEmpty = visibleCategories.every((c) => c.entries.length === 0);

  const inventoryActions = (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={fetchData}
      />
      <Action.OpenInBrowser
        title="Open Habitica Inventory"
        url="https://habitica.com/inventory/items"
        shortcut={{ modifiers: ["cmd"], key: "o" }}
      />
    </ActionPanel>
  );

  return (
    <Grid
      isLoading={isLoading}
      searchBarPlaceholder="Search inventory…"
      columns={8}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter Category" onChange={setCategory} value={category}>
          <Grid.Dropdown.Item title="All Items" value="all" />
          <Grid.Dropdown.Item title="Eggs" value="eggs" />
          <Grid.Dropdown.Item title="Hatching Potions" value="potions" />
          <Grid.Dropdown.Item title="Pet Food and Saddles" value="food" />
          <Grid.Dropdown.Item title="Special" value="special" />
          <Grid.Dropdown.Item title="Quests" value="quests" />
        </Grid.Dropdown>
      }
    >
      {isEmpty && !isLoading ? (
        <Grid.EmptyView title="No items in this category" description="Go on some adventures to collect more!" />
      ) : (
        visibleCategories
          .filter((c) => c.entries.length > 0)
          .map((c) => (
            <Grid.Section key={c.key} title={`${c.label} (${c.entries.length})`}>
              {c.entries.map(([key, count]) => (
                <Grid.Item
                  key={`${c.key}-${key}`}
                  title={key}
                  subtitle={`×${count}`}
                  content={c.imageUrl(key)}
                  actions={inventoryActions}
                />
              ))}
            </Grid.Section>
          ))
      )}
    </Grid>
  );
}
