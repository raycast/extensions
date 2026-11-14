export const SITE_URL = "https://metaforge.app";
const BASE_URL = `${SITE_URL}/api/arc-raiders`;

export const API = {
  items: `${BASE_URL}/items`,
  arcs: `${BASE_URL}/arcs`,
  quests: `${BASE_URL}/quests`,
  eventsSchedule: `${BASE_URL}/events-schedule`,
  traders: `${BASE_URL}/traders`,
};

export function apiUrl(endpoint: string, params: Record<string, string | number | undefined> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${endpoint}?${query}` : endpoint;
}

export const MetaForgeUrl = {
  item: (id: string) => `${SITE_URL}/arc-raiders/database/item/${id}`,
  quest: (id: string) => `${SITE_URL}/arc-raiders/database/quest/${id}`,
  arc: (id: string) => `${SITE_URL}/arc-raiders/database/arc/${id}`,
  map: (slug: string) => `${SITE_URL}/arc-raiders/map/${slug}`,
  // guide_url is returned as a site-relative path, e.g. "/arc-raiders/how-to-find-..."
  absolute: (path: string) =>
    /^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`,
};

export interface GuideLink {
  url: string;
  label: string;
}

/** Compact item reference embedded in quests, loot tables, recipes and trader offers. */
export interface ItemRef {
  id: string;
  name: string;
  icon: string;
  rarity: string | null;
  item_type: string;
  value?: number | null;
  description?: string | null;
}

export interface MapLocation {
  id: string;
  map: string;
}

export interface CosmeticSetting {
  name: string;
  options: { name: string }[];
}

export interface Cosmetic {
  kind: string;
  slot: string;
  settings: CosmeticSetting[];
  optionName?: string;
  parentName?: string;
  parentItemId?: string;
}

export interface Item {
  id: string;
  name: string;
  description: string | null;
  item_type: string;
  loadout_slots: string[];
  icon: string;
  rarity: string | null;
  value: number | null;
  workbench: string | null;
  stat_block: Record<string, number | string | null>;
  flavor_text: string | null;
  subcategory: string | null;
  loot_area: string | null;
  ammo_type: string | null;
  shield_type: string | null;
  sources: unknown[] | null;
  locations: MapLocation[];
  guide_links?: GuideLink[];
  guide_url?: string | null;
  /** Long-form HTML write-up. */
  article?: string | null;
  cosmetic?: Cosmetic | null;
  unlocks_weapon?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ItemQuantity {
  quantity: number;
  component: ItemRef;
}

export interface ItemUsage {
  quantity: number;
  item: ItemRef;
}

export interface ArcRef {
  id: string;
  name: string;
  icon: string;
  description?: string | null;
}

/** Relationship fields returned when requesting items with `includeComponents=true`. */
export interface ItemRelations {
  components?: ItemQuantity[];
  recycle_components?: ItemQuantity[];
  used_in?: ItemUsage[];
  recycle_from?: ItemUsage[];
  mods?: { mod: ItemRef }[];
  dropped_by?: { arc: ArcRef; arc_id: string }[];
  sold_by?: { price: number; trader_name: string }[];
}

export type ItemWithRelations = Item & ItemRelations;

export interface QuestItem {
  /** Absent on references to items MetaForge hasn't added yet. */
  id?: string;
  item_id: string;
  /** Missing when the referenced item has not been added to MetaForge's database yet. */
  item?: ItemRef | null;
  quantity: number | string;
}

export interface Quest {
  id: string;
  name: string;
  objectives: string[];
  xp: number;
  required_items: QuestItem[];
  granted_items: QuestItem[];
  rewards: QuestItem[];
  locations: MapLocation[];
  marker_category: string | null;
  image: string | null;
  trader_name: string | null;
  guide_links?: GuideLink[];
  guide_url?: string | null;
  sort_order?: number;
  position?: { x: number; y: number } | null;
  created_at?: string;
  updated_at?: string;
}

export interface ArcLoot {
  id: string;
  item_id: string;
  item?: ItemRef | null;
}

/** Resolves an embedded item reference, falling back to a placeholder built from its id. */
export function resolveItemRef(item: ItemRef | null | undefined, itemId: string): ItemRef {
  if (item?.name) return item;
  const name = itemId.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return { id: itemId, name, icon: "", rarity: null, item_type: "" };
}

export interface Arc {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  image: string | null;
  guide_url?: string | null;
  loot?: ArcLoot[];
  data?: { variants?: { can_fly?: boolean }[] } | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventTimer {
  name: string;
  map: string;
  icon: string;
  startTime: number;
  endTime: number;
}

export interface EventsScheduleResponse {
  data: EventTimer[];
  cachedAt?: number;
  region?: string;
}

export interface TraderItem {
  id: string;
  icon: string;
  name: string;
  value: number | null;
  rarity: string | null;
  item_type: string;
  description: string | null;
  trader_price: number;
}

export interface BarterItem {
  id: string;
  name: string;
  /** Either a URL or an internal asset key for category entries such as "Any Firearm". */
  icon: string;
  value: number | null;
  rarity: string | null;
  item_type: string;
  amount?: number;
  is_category?: boolean;
}

export interface BarterOffer {
  id: string;
  offer_title: string;
  coin_cost: number;
  offer_start: string;
  offer_end: string;
  accepted_items: BarterItem[];
  item: ItemRef | null;
}

export interface BarterService {
  id: string;
  name: string;
  description: string;
  coin_cost: number;
  accepted_items: BarterItem[];
}

/** Ermal is returned beside the regular trader inventories rather than inside `data`. */
export interface Ermal {
  offers: BarterOffer[];
  permanent_services: BarterService[];
  synced_at?: string;
}

export interface TradersResponse {
  success: boolean;
  data: Record<string, TraderItem[]>;
  ermal?: Ermal;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

const MAX_PAGES = 50;

/** Walks every page of a paginated endpoint. Used for small collections that need complete client-side filtering. */
export async function fetchAllPages<T extends { id: string }>(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T[]> {
  const byId = new Map<string, T>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await fetch(apiUrl(endpoint, { ...params, page }));
    if (!response.ok) throw new Error(`MetaForge responded with ${response.status} ${response.statusText}`);
    const result = (await response.json()) as PaginatedResponse<T>;
    for (const entry of result.data) byId.set(entry.id, entry);
    if (!result.pagination?.hasNextPage) break;
  }
  return [...byId.values()];
}

// The API has no endpoint listing item types, so this mirrors the values it currently returns.
export const ITEM_TYPES = [
  "Ammunition",
  "Augment",
  "Basic Material",
  "Blueprint",
  "Cosmetic",
  "Design",
  "Furniture",
  "Key",
  "Material",
  "Misc",
  "Modification",
  "Nature",
  "Outfits",
  "Quest Item",
  "Quick Use",
  "Recyclable",
  "Refined Material",
  "Research",
  "Research Item",
  "Shield",
  "Stencil",
  "Topside Material",
  "Trinket",
  "Weapon",
];

export const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Amplified"];

export function getRarityColor(rarity: string | null | undefined): string {
  switch (rarity?.toLowerCase()) {
    case "common":
      return "#9d9d9d";
    case "uncommon":
      return "#1eff00";
    case "rare":
      return "#0070dd";
    case "epic":
      return "#a335ee";
    case "legendary":
      return "#ff8000";
    case "amplified":
      return "#e78728";
    default:
      return "#ffffff";
  }
}
