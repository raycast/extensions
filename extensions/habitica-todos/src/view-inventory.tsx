import { ActionPanel, Action, Icon, Grid, showToast, Toast, Alert, confirmAlert, useNavigation } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getUser, equipItem, sellItem, openMysteryItem } from "./api";
import { HabiticaUser } from "./types";
import { ASSET_BASE_URL } from "./constants";
import HatchForm from "./hatch-form";
import FeedForm from "./feed-form";

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
  const { push } = useNavigation();

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

  async function handleSell(type: "eggs" | "hatchingPotions" | "food", key: string) {
    const confirmed = await confirmAlert({
      title: `Sell ${key}?`,
      message: `Selling exchanges items for a small amount of gold.`,
      primaryAction: { title: "Sell One", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await showToast({ style: Toast.Style.Animated, title: "Selling…" });
      await sellItem(type, key);
      await showToast({ style: Toast.Style.Success, title: "Item sold" });
      await fetchData();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to sell", message: String(error) });
    }
  }

  async function handleEquipPet(petKey: string) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Equipping pet…" });
      await equipItem("pet", petKey);
      await showToast({ style: Toast.Style.Success, title: "Pet equipped" });
      await fetchData();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(error) });
    }
  }

  async function handleEquipMount(mountKey: string) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Equipping mount…" });
      await equipItem("mount", mountKey);
      await showToast({ style: Toast.Style.Success, title: "Mount equipped" });
      await fetchData();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(error) });
    }
  }

  async function handleOpenMystery() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Opening mystery item…" });
      await openMysteryItem();
      await showToast({ style: Toast.Style.Success, title: "Mystery item opened!" });
      await fetchData();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(error) });
    }
  }

  const items = user?.items;
  const ownedPets = items?.pets ?? {};
  const ownedMounts = items?.mounts ?? {};
  const eggEntries = buildInventoryEntries(items?.eggs);
  const potionEntries = buildInventoryEntries(items?.hatchingPotions);

  type CategoryKind = "eggs" | "potions" | "food" | "special" | "quests" | "pets" | "mounts";

  interface InventoryCategory {
    key: CategoryKind;
    label: string;
    entries: InventoryEntry[];
    imageUrl: (k: string) => string;
  }

  const petEntries: InventoryEntry[] = Object.entries(ownedPets)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b)) as InventoryEntry[];
  // Mounts are stored as booleans (true = owned). Convert to 1/0 so the inventory grid
  // can share the same `InventoryEntry` shape (count is purely informational for mounts).
  const mountEntries: InventoryEntry[] = Object.entries(ownedMounts)
    .filter(([, owned]) => owned === true)
    .map(([key]) => [key, 1] as InventoryEntry)
    .sort((a, b) => a[0].localeCompare(b[0]));

  const categories: InventoryCategory[] = [
    {
      key: "eggs",
      label: "Eggs",
      entries: eggEntries,
      imageUrl: (k) => `${ASSET_BASE_URL}Pet_Egg_${k}.png`,
    },
    {
      key: "potions",
      label: "Hatching Potions",
      entries: potionEntries,
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
    {
      key: "pets",
      label: "Pets",
      entries: petEntries,
      imageUrl: (k) => `${ASSET_BASE_URL}Pet-${k}.png`,
    },
    {
      key: "mounts",
      label: "Mounts",
      entries: mountEntries,
      imageUrl: (k) => `${ASSET_BASE_URL}Mount_Icon_${k}.png`,
    },
  ];

  const visibleCategories = category === "all" ? categories : categories.filter((c) => c.key === category);
  const isEmpty = visibleCategories.every((c) => c.entries.length === 0);

  const pendingMystery = user?.purchased?.plan?.mysteryItems?.length ?? 0;

  const baseActions = (
    <>
      {pendingMystery > 0 && (
        <Action
          title={`Open Mystery Item (${pendingMystery} Pending)`}
          icon={Icon.Gift}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          onAction={handleOpenMystery}
        />
      )}
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
    </>
  );

  function itemActions(c: InventoryCategory, key: string) {
    switch (c.key) {
      case "eggs":
        return (
          <ActionPanel>
            <Action
              title="Hatch Pet"
              icon={Icon.NewDocument}
              onAction={() => push(<HatchForm eggKey={key} potions={potionEntries} onSubmitted={fetchData} />)}
            />
            <Action
              title="Sell Egg"
              icon={Icon.Coins}
              style={Action.Style.Destructive}
              onAction={() => handleSell("eggs", key)}
            />
            {baseActions}
          </ActionPanel>
        );
      case "potions":
        return (
          <ActionPanel>
            <Action
              title="Hatch Egg"
              icon={Icon.NewDocument}
              onAction={() => push(<HatchForm potionKey={key} eggs={eggEntries} onSubmitted={fetchData} />)}
            />
            <Action
              title="Sell Potion"
              icon={Icon.Coins}
              style={Action.Style.Destructive}
              onAction={() => handleSell("hatchingPotions", key)}
            />
            {baseActions}
          </ActionPanel>
        );
      case "food":
        return (
          <ActionPanel>
            <Action
              title="Feed a Pet"
              icon={Icon.Heart}
              onAction={() => push(<FeedForm foodKey={key} pets={petEntries} onSubmitted={fetchData} />)}
            />
            <Action
              title="Sell Food"
              icon={Icon.Coins}
              style={Action.Style.Destructive}
              onAction={() => handleSell("food", key)}
            />
            {baseActions}
          </ActionPanel>
        );
      case "special":
        return <ActionPanel>{baseActions}</ActionPanel>;
      case "pets":
        return (
          <ActionPanel>
            <Action
              title={items?.currentPet === key ? "Unequip Pet" : "Equip Pet"}
              icon={items?.currentPet === key ? Icon.Circle : Icon.CheckCircle}
              onAction={() => handleEquipPet(key)}
            />
            {baseActions}
          </ActionPanel>
        );
      case "mounts":
        return (
          <ActionPanel>
            <Action
              title={items?.currentMount === key ? "Unequip Mount" : "Equip Mount"}
              icon={items?.currentMount === key ? Icon.Circle : Icon.CheckCircle}
              onAction={() => handleEquipMount(key)}
            />
            {baseActions}
          </ActionPanel>
        );
      default:
        return <ActionPanel>{baseActions}</ActionPanel>;
    }
  }

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
          <Grid.Dropdown.Item title="Pets" value="pets" />
          <Grid.Dropdown.Item title="Mounts" value="mounts" />
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
              {c.entries.map(([key, count]) => {
                const equippedSuffix =
                  (c.key === "pets" && items?.currentPet === key) || (c.key === "mounts" && items?.currentMount === key)
                    ? " (equipped)"
                    : "";
                return (
                  <Grid.Item
                    key={`${c.key}-${key}`}
                    title={key + equippedSuffix}
                    subtitle={c.key === "pets" || c.key === "mounts" ? undefined : `×${count}`}
                    content={c.imageUrl(key)}
                    actions={itemActions(c, key)}
                  />
                );
              })}
            </Grid.Section>
          ))
      )}
    </Grid>
  );
}
