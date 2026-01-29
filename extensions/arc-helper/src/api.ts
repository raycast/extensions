const BASE_URL = "https://metaforge.app/api/arc-raiders";

export interface Item {
  id: string;
  name: string;
  description: string;
  item_type: string;
  loadout_slots: string[];
  icon: string;
  rarity: string;
  value: number;
  workbench: string | null;
  stat_block: Record<string, number | string>;
  flavor_text: string | null;
  subcategory: string | null;
  loot_area: string | null;
  ammo_type: string | null;
}

export interface QuestReward {
  id: string;
  item: {
    id: string;
    icon: string;
    name: string;
    rarity: string;
    item_type: string;
  };
  item_id: string;
  quantity: string;
}

export interface QuestLocation {
  id: string;
  map: string;
}

export interface Quest {
  id: string;
  name: string;
  objectives: string[];
  xp: number;
  granted_items: string[];
  locations: QuestLocation[];
  marker_category: string | null;
  required_items: string[];
  rewards: QuestReward[];
}

export interface Arc {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
}

export interface EventTimer {
  name: string;
  map: string;
  icon: string;
  startTime: number;
  endTime: number;
}

export interface TraderItem {
  id: string;
  icon: string;
  name: string;
  value: number;
  rarity: string;
  item_type: string;
  description: string;
  trader_price: number;
}

export interface TradersResponse {
  success: boolean;
  data: Record<string, TraderItem[]>;
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

export const API = {
  items: `${BASE_URL}/items`,
  arcs: `${BASE_URL}/arcs`,
  quests: `${BASE_URL}/quests`,
  eventTimers: `${BASE_URL}/events-schedule`,
  traders: `${BASE_URL}/traders`,
};

export function getRarityColor(rarity: string): string {
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
    default:
      return "#ffffff";
  }
}

export function getRarityIcon(rarity: string): string {
  switch (rarity?.toLowerCase()) {
    case "common":
      return "circle";
    case "uncommon":
      return "star";
    case "rare":
      return "star-circle";
    case "epic":
      return "sparkles";
    case "legendary":
      return "trophy";
    default:
      return "dot";
  }
}
