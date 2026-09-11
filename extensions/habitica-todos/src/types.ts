// ---------------------------------------------------------------------------
// Shared sub-types
// ---------------------------------------------------------------------------

export type GearSlot = "weapon" | "armor" | "head" | "shield" | "headAccessory" | "eyewear" | "back" | "body";
export type TaskAttribute = "str" | "int" | "per" | "con";

export interface GearItem {
  text: string;
  notes: string;
  value: number;
  type: GearSlot;
  /** The class this gear belongs to: "warrior", "healer", "wizard", "rogue", "special", "armoire", etc. */
  klass?: string;
  tier?: number;
  str?: number;
  int?: number;
  per?: number;
  con?: number;
  twoHanded?: boolean;
}

// ---------------------------------------------------------------------------
// Main types
// ---------------------------------------------------------------------------

export interface HabiticaUser {
  id: string;
  profile: {
    imageUrl?: string;
  };
  stats: {
    hp: number;
    mp: number;
    exp: number;
    toNextLevel: number;
    lvl: number;
    gp: number;
    maxHealth?: number;
    maxMP?: number;
    class?: string;
    points?: number;
    str?: number;
    con?: number;
    int?: number;
    per?: number;
  };
  /** Death buff. Active when user died and must revive. */
  needsCron?: boolean;
  flags?: {
    classSelected?: boolean;
    rebirthEnabled?: boolean;
  };
  purchased?: {
    plan?: {
      mysteryItems?: string[];
    };
  };
  party?: {
    quest?: {
      key: string;
      active: boolean;
      progress?: {
        up?: number;
        down?: number;
        collect?: Record<string, number>;
      };
    };
  };
  items: {
    eggs: Record<string, number>;
    hatchingPotions: Record<string, number>;
    food: Record<string, number>;
    quests: Record<string, number>;
    special: Record<string, number>;
    gear: {
      equipped: Record<string, string>;
      costume: Record<string, string>;
      owned: Record<string, boolean>;
    };
    /** Pets store feed progress (5–50); -1 indicates a released pet. */
    pets: Record<string, number>;
    /** Mounts store boolean ownership; false indicates a released mount. */
    mounts: Record<string, boolean>;
    currentPet?: string;
    currentMount?: string;
  };
  preferences: {
    hair: { color: string; base: number; bangs: number; flower: number; mustache: number; beard: number };
    skin: string;
    shirt: string;
    size: string;
    background: string;
    sleep: boolean;
    /** Chair/wheelchair style. "none" or empty string means no chair. */
    chair?: string;
    /** When true, render costume gear instead of equipped gear. */
    costume?: boolean;
  };
}

export interface HabiticaChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface HabiticaTask {
  id: string;
  text: string;
  notes: string;
  completed: boolean;
  type: "habit" | "daily" | "todo" | "reward";
  value: number;
  priority: number;
  attribute: TaskAttribute;
  date?: string | null;
  tags: string[];
  counterUp?: number;
  counterDown?: number;
  streak?: number;
  up?: boolean;
  down?: boolean;
  checklist?: HabiticaChecklistItem[];
}

export interface HabiticaTag {
  id: string;
  name: string;
}

export interface CreateTaskBody {
  text: string;
  type: "todo" | "habit" | "daily" | "reward";
  notes?: string;
  priority?: number;
  date?: string;
  tags?: string[];
  attribute?: TaskAttribute;
  checklist?: { text: string; completed?: boolean }[];
}

export interface UpdateTaskBody {
  text?: string;
  notes?: string;
  priority?: number;
  date?: string;
  attribute?: TaskAttribute;
}

/** Only the gear subset is fetched from /api/v3/content (fields=gear). */
export interface HabiticaContent {
  gear: {
    flat: Record<string, GearItem>;
  };
}
