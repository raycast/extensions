import { ActionPanel, Action, Icon, List, showToast, Toast, Color, Image } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { getTasks, getUser, getContent, buyHealthPotion, buyGear, scoreTask, buyArmoire } from "./api";
import { HabiticaUser, HabiticaContent } from "./types";
import { ASSET_BASE_URL } from "./constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ShopItemType = "reward" | "market" | "gear";

interface ShopItem {
  id: string;
  text: string;
  notes?: string;
  value: number;
  type: ShopItemType;
  icon?: Icon;
  imageUrl?: string;
  gearKey?: string;
  /** Derived from the gear key prefix (e.g. "weapon", "headAccessory"). */
  gearType?: string;
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

type FilterValue =
  | "all"
  | "affordable"
  | "market"
  | "reward"
  | "weapon"
  | "armor"
  | "head"
  | "shield"
  | "headAccessory"
  | "eyewear"
  | "back"
  | "body";

const FILTER_OPTIONS: { value: FilterValue; title: string; icon: Icon }[] = [
  { value: "all", title: "All Items", icon: Icon.List },
  { value: "affordable", title: "Affordable", icon: Icon.Coins },
  { value: "market", title: "Market", icon: Icon.Cart },
  { value: "weapon", title: "Weapons", icon: Icon.Hammer },
  { value: "armor", title: "Armor", icon: Icon.Shield },
  { value: "head", title: "Helmets", icon: Icon.Crown },
  { value: "shield", title: "Off-Hand", icon: Icon.Circle },
  { value: "headAccessory", title: "Head Accessories", icon: Icon.Stars },
  { value: "eyewear", title: "Eyewear", icon: Icon.Eye },
  { value: "back", title: "Back Accessories", icon: Icon.ArrowUp },
  { value: "body", title: "Body Accessories", icon: Icon.Person },
  { value: "reward", title: "Custom Rewards", icon: Icon.Gift },
];

function matchesFilter(item: ShopItem, filter: FilterValue, userGp: number): boolean {
  switch (filter) {
    case "all":
      return true;
    case "affordable":
      return item.value <= userGp;
    case "market":
      return item.type === "market";
    case "reward":
      return item.type === "reward";
    default:
      return item.type === "gear" && item.gearType === filter;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GEAR_TYPE_ORDER = ["weapon", "armor", "head", "shield", "headAccessory", "eyewear", "back", "body"];
const GEAR_TYPE_LABEL: Record<string, string> = {
  weapon: "Weapon",
  armor: "Armor",
  head: "Helmet",
  shield: "Off-Hand",
  headAccessory: "Head Accessory",
  eyewear: "Eyewear",
  back: "Back Accessory",
  body: "Body Accessory",
};

/**
 * Derives the gear slot from the key prefix, e.g.:
 *   "weapon_warrior_1"    → "weapon"
 *   "headAccessory_rogue_1" → "headAccessory"
 * This is more reliable than trusting gear.type from the API response.
 */
function gearTypeFromKey(key: string): string {
  for (const slot of GEAR_TYPE_ORDER) {
    if (key.startsWith(slot + "_")) return slot;
  }
  return key.split("_")[0];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gearImageUrl(key: string): string {
  return `${ASSET_BASE_URL}shop_${key}.png`;
}

function imageMarkdown(url: string, alt: string): string {
  return `<img src="${url}" alt="${alt}" width="220" />`;
}

function buildGearItems(user: HabiticaUser, content: HabiticaContent): ShopItem[] {
  const userClass = user.stats.class ?? "warrior";
  const ownedKeys = user.items.gear.owned ?? {};

  return Object.entries(content.gear.flat)
    .filter(([key, gear]) => gear.klass === userClass && gear.value > 0 && !ownedKeys[key])
    .sort((a, b) => a[1].value - b[1].value)
    .map(([key, gear]) => ({
      id: `gear:${key}`,
      text: gear.text,
      notes: gear.notes,
      value: gear.value,
      type: "gear" as const,
      gearKey: key,
      gearType: gearTypeFromKey(key),
      imageUrl: gearImageUrl(key),
    }));
}

function resolveIcon(item: ShopItem, fallback: Icon): Icon | { source: string; mask: Image.Mask } {
  if (item.imageUrl) return { source: item.imageUrl, mask: Image.Mask.RoundedRectangle };
  return item.icon ?? fallback;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Command() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [user, setUser] = useState<HabiticaUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rewards, userData, content] = await Promise.all([getTasks("rewards"), getUser(), getContent()]);
      setUser(userData);

      const shopItems: ShopItem[] = [
        ...(userData.stats.hp < (userData.stats.maxHealth ?? 50)
          ? [
              {
                id: "health_potion",
                text: "Health Potion",
                notes: "Restores 15 Health.",
                value: 25,
                type: "market" as const,
                icon: Icon.Heart,
              },
            ]
          : []),
        ...(userData.stats.lvl >= 10
          ? [
              {
                id: "enchanted_armoire",
                text: "Enchanted Armoire",
                notes: "Get either gear, food, or XP!",
                value: 100,
                type: "market" as const,
                icon: Icon.Box,
                imageUrl: `${ASSET_BASE_URL}shop_armoire.png`,
              },
            ]
          : []),
        ...buildGearItems(userData, content),
        ...rewards.map((r) => ({ id: r.id, text: r.text, notes: r.notes, value: r.value, type: "reward" as const })),
      ];

      setItems(shopItems);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to load shop", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleBuy(item: ShopItem) {
    if (user && user.stats.gp < item.value) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not enough gold!",
        message: `You need ${item.value.toFixed(2)} GP`,
      });
      return;
    }
    try {
      await showToast({ style: Toast.Style.Animated, title: "Purchasing…" });
      if (item.id === "health_potion") await buyHealthPotion();
      else if (item.id === "enchanted_armoire") await buyArmoire();
      else if (item.type === "gear" && item.gearKey) await buyGear(item.gearKey);
      else await scoreTask(item.id, "up");
      await showToast({ style: Toast.Style.Success, title: "Purchased!" });
      await fetchData();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Purchase failed", message: String(error) });
    }
  }

  const userGp = user?.stats.gp ?? 0;
  const goldLabel = user ? `${userGp.toFixed(2)} GP` : undefined;

  const filteredItems = items.filter((i) => matchesFilter(i, filter, userGp));

  const gearByType = GEAR_TYPE_ORDER.reduce<Record<string, ShopItem[]>>((acc, slot) => {
    acc[slot] = filteredItems.filter((i) => i.type === "gear" && i.gearType === slot);
    return acc;
  }, {});

  const showMarket = filteredItems.some((i) => i.type === "market");
  const showGear = filteredItems.some((i) => i.type === "gear");
  const showRewards = filteredItems.some((i) => i.type === "reward");

  function renderDetail(item: ShopItem, categoryLabel?: string) {
    return (
      <List.Item.Detail
        markdown={item.imageUrl ? imageMarkdown(item.imageUrl, item.text) : undefined}
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={item.text} />
            {item.notes ? <List.Item.Detail.Metadata.Label title="Description" text={item.notes} /> : null}
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title="Price"
              text={`${item.value} GP`}
              icon={{ source: Icon.Coins, tintColor: item.value <= userGp ? Color.Green : Color.Red }}
            />
            {categoryLabel ? <List.Item.Detail.Metadata.Label title="Category" text={categoryLabel} /> : null}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  const filterDropdown = (
    <List.Dropdown tooltip="Filter items" value={filter} onChange={(val) => setFilter(val as FilterValue)}>
      <List.Dropdown.Section title="Show">
        {FILTER_OPTIONS.map((opt) => (
          <List.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} icon={opt.icon} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search shop…"
      navigationTitle="Habitica Shop"
      isShowingDetail
      searchBarAccessory={filterDropdown}
    >
      {showMarket && (
        <List.Section title="Market" subtitle={goldLabel}>
          {filteredItems
            .filter((i) => i.type === "market")
            .map((item) => (
              <List.Item
                key={item.id}
                title={item.text}
                subtitle={`${item.value} GP`}
                icon={resolveIcon(item, Icon.Cart)}
                detail={renderDetail(item, "Market")}
                actions={
                  <ActionPanel>
                    <Action title="Buy Item" icon={Icon.Cart} onAction={() => handleBuy(item)} />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchData} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}

      {showGear &&
        GEAR_TYPE_ORDER.map((slot) => {
          const gearItems = gearByType[slot];
          if (!gearItems || gearItems.length === 0) return null;
          const label = GEAR_TYPE_LABEL[slot] ?? slot;
          return (
            <List.Section key={slot} title={label} subtitle={goldLabel}>
              {gearItems.map((item) => (
                <List.Item
                  key={item.id}
                  title={item.text}
                  subtitle={`${item.value} GP`}
                  icon={resolveIcon(item, Icon.Hammer)}
                  detail={renderDetail(item, label)}
                  actions={
                    <ActionPanel>
                      <Action title="Buy Gear" icon={Icon.Cart} onAction={() => handleBuy(item)} />
                      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchData} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })}

      {showRewards && (
        <List.Section title="Custom Rewards" subtitle={goldLabel}>
          {filteredItems
            .filter((i) => i.type === "reward")
            .map((item) => (
              <List.Item
                key={item.id}
                title={item.text}
                subtitle={`${item.value} GP`}
                icon={Icon.Stars}
                detail={renderDetail(item, "Custom Reward")}
                actions={
                  <ActionPanel>
                    <Action title="Buy Reward" icon={Icon.Cart} onAction={() => handleBuy(item)} />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={fetchData} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      )}
    </List>
  );
}
