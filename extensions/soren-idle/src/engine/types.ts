export type SkillId =
  | "salvaging"
  | "mining"
  | "foraging"
  | "cooking"
  | "engineering"
  | "combat"
  | "hydroponics"
  | "xenochemistry";

export type ItemId =
  | "scrap_metal"
  | "circuit_scrap"
  | "ferrite_ore"
  | "lumina_crystal"
  | "glowcap"
  | "sweetroot"
  | "ration"
  | "alloy_plate"
  | "circuit_board"
  | "servo_unit"
  | "power_core"
  | "fusion_cell"
  | "cutting_torch"
  | "plasma_drill"
  | "harvest_kit"
  | "pulse_blade"
  | "composite_armor"
  | "chitin_shard"
  | "xeno_core"
  | "glyph_tablet"
  | "resonance_coil"
  | "void_lens"
  | "star_honey"
  | "skyweave_thread"
  | "aether_cell"
  | "honey_ration"
  | "skyweave_suit"
  | "sorenian_lance"
  | "sorenian_warplate"
  | "stim_pack"
  | "prism_geode"
  | "star_sapphire"
  | "nav_core"
  | "flight_recorder"
  | "golden_spore"
  | "amber_bulb"
  | "prospector_charm"
  | "swift_tonic"
  | "fortune_draught"
  | "fury_serum"
  | "quicksilver_tonic"
  | "windfall_elixir"
  | "berserker_extract"
  | "arc_torch"
  | "quantum_drill"
  | "deep_harvester"
  | "arc_saber"
  | "ward_plate"
  | "scout_visor"
  | "prism_visor"
  | "shard_cleaver"
  | "spore_lance"
  | "siege_maul"
  | "thorn_lance"
  | "fang_blade"
  | "chitin_crown"
  | "sovereign_mail"
  | "matriarch_chitin"
  | "broodking_fang"
  | "sovereign_shard";

export type Bundle = Partial<Record<ItemId, number>>;

/** Kinetic beats bio, bio beats energy, energy beats kinetic. */
export type DamageType = "kinetic" | "energy" | "bio";

export type EquipSlot = "weapon" | "body" | "head" | "salvager" | "miner" | "forager" | "charm";

export interface ItemDef {
  id: ItemId;
  name: string;
  description: string;
  /** What one unit is worth in Credits at the base sell rate. */
  value: number;
  /** Heals this much HP when eaten. */
  heal?: number;
  /** Where it is worn. Only equipped gear counts; each slot holds one item. */
  slot?: EquipSlot;
  /** Higher tiers replace lower ones automatically when you get them. */
  tier?: number;
  /** A weapon's damage type, or the type a body armor is tuned against. */
  damageType?: DamageType;
  /** Combat level needed to equip it. */
  combatReq?: number;
  /** Equipped, this makes tasks of `skill` take `speed` times as long. */
  tool?: { skill: SkillId; speed: number };
  /** Equipped, this adds this much damage per combat round. */
  weaponDamage?: number;
  /** Equipped, this reduces damage taken per round. */
  armor?: number;
  /** Equipped, this multiplies the chance of rare drops by this much. */
  rareBonus?: number;
  /** Drinking this gives a timed buff. */
  potion?: Potion;
  /** The locals do not buy this: it cannot be sold. */
  unsellable?: boolean;
}

/** One thing the Bounty Shop sells. */
export interface ShopEntry {
  item: ItemId;
  /** Price in Bounty Marks. */
  cost: number;
  /** Bounty level needed before you can buy it. */
  levelReq: number;
}

/** What a potion improves. */
export type BuffKind = "speed" | "yield" | "damage";

export interface Potion {
  kind: BuffKind;
  /** Speed: share of the usual time a task takes. Yield: output multiplier. Damage: bonus per round. */
  power: number;
  durationMs: number;
}

export interface ActiveBuff {
  item: ItemId;
  power: number;
  expiresAt: number;
}

export interface SkillDef {
  id: SkillId;
  name: string;
  blurb: string;
}

export interface Monster {
  name: string;
  type: DamageType;
  hp: number;
  damage: number;
  drops: Bundle;
}

/** A chance, rolled every cycle, of finding something on top of the usual output. */
export interface RareDrop {
  item: ItemId;
  chance: number;
}

export interface TaskDef {
  id: string;
  skill: SkillId;
  name: string;
  description: string;
  levelReq: number;
  durationMs: number;
  xp: number;
  inputs?: Bundle;
  outputs?: Bundle;
  /** Stops after one cycle (one-off crafts such as gear). */
  once?: boolean;
  monster?: Monster;
  rareDrops?: RareDrop[];
  /** A boss fight, see `areas`. */
  boss?: boolean;
  /** A resource node: every cycle is a hit, and when it runs out it takes `respawnMs` to come back. */
  node?: { hp: number; respawnMs: number };
}

/** A stretch of wilderness: a few creatures, and a boss that appears once you have thinned them out. */
export interface AreaDef {
  id: string;
  name: string;
  blurb: string;
  /** Hunt task ids, easiest first. */
  hunts: string[];
  /** The boss's task id. */
  boss: string;
  /** Kills across the area's hunts before the boss shows itself. */
  bossKills: number;
}

export type BuildingId =
  | "shelter"
  | "generator"
  | "workshop"
  | "salvage_drone"
  | "mining_drone"
  | "forager_drone"
  | "beacon"
  | "translator"
  | "hub"
  | "hydroponic_bay"
  | "bounty_board"
  | "storage"
  | "stasis_pod";

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  maxLevel: number;
  /** Cost of level 1. Each further level multiplies it by `costGrowth`. */
  baseCost: Bundle;
  costGrowth: number;
  /** Explicit cost per level (index 0 is level 1). Overrides baseCost and costGrowth. */
  levelCosts?: Bundle[];
  /** Credits each level costs on top of the materials (index 0 is level 1). */
  levelCredits?: number[];
  /** One line per level describing what that level gives you. */
  levelNotes?: string[];
  requires?: { skill: SkillId; level: number };
  /** The locals must have answered the beacon first. */
  requiresContact?: boolean;
  requiresBuilding?: { id: BuildingId; level: number };
  /** Power the building adds / draws per level. */
  powerProvided?: number;
  powerUse?: number;
  /** Per level, produces one `item` every `everyMs`, scaled down when power is short. */
  produces?: { item: ItemId; everyMs: number };
}

export interface CropDef {
  id: string;
  name: string;
  description: string;
  levelReq: number;
  growMs: number;
  xp: number;
  /** Seed stock planted into an empty plot. */
  seeds: Bundle;
  /** Collected at harvest. */
  yield: Bundle;
}

export interface Plot {
  crop: string;
  plantedAt: number;
}

export type FoodPriority = "weakest" | "strongest";

/** A request posted on the Bounty Board: defeat `count` of the creature hunted by `task`. */
export interface Bounty {
  id: number;
  /** The local who posted it. */
  poster: string;
  /** A line of flavour from the poster. */
  line: string;
  /** The hunt that counts: only kills made while this task runs add progress. */
  task: string;
  count: number;
  tier: number;
  marks: number;
  xp: number;
}

export interface BountyBoard {
  offers: Bounty[];
  active: { bounty: Bounty; progress: number } | null;
  /** When the unclaimed offers are replaced, or 0 while no board has been built. */
  refreshAt: number;
  nextId: number;
}

export interface Settings {
  /** Eat when HP drops below this share of max HP. 0 means only when the next fight needs it. */
  eatBelow: number;
  foodPriority: FoodPriority;
}

export interface StockItem {
  item: ItemId;
  /** Price per unit in Credits before discounts. */
  price: number;
  /** Translation Device level needed before the locals offer it. */
  tier: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  lastTick: number;
  activeTask: string | null;
  /** Milliseconds already spent on the current cycle. */
  taskProgressMs: number;
  /** Cycles left in the current run, or null to repeat until it cannot continue. */
  taskRemaining: number | null;
  hp: number;
  xp: Record<SkillId, number>;
  inventory: Bundle;
  /** State of the seeded random number generator; every roll in the game advances it. */
  rng: number;
  /** Currency earned by trading with the locals. */
  credits: number;
  /** Currency earned by finishing bounties. */
  marks: number;
  bountyXp: number;
  board: BountyBoard;
  /** When the locals answer the beacon, or null while no beacon has been built. */
  contactAt: number | null;
  buildings: Partial<Record<BuildingId, number>>;
  /** Fractional output of passive buildings, carried between ticks. */
  passive: Partial<Record<BuildingId, number>>;
  /** What is worn in each slot. */
  equipped: Partial<Record<EquipSlot, ItemId>>;
  /** Potion effects that are running, one per kind. */
  buffs: Partial<Record<BuffKind, ActiveBuff>>;
  /** Items to keep back when selling, per item. */
  keep: Partial<Record<ItemId, number>>;
  settings: Settings;
  /** Mastery XP per task id. */
  mastery: Record<string, number>;
  /** Resource nodes that have been hit: health left, and when a spent one comes back. */
  nodes: Record<string, { hp: number; respawnAt?: number }>;
  /** One entry per hydroponic plot; null is an empty plot. */
  plots: (Plot | null)[];
  /** What happened while the menu bar ticker ran and the game was not open, until you look. */
  unseen: Report | null;
  /** Ids of first-run hints the player has already seen. */
  hints: string[];
  /** Lifetime counters, mostly for flavour. */
  stats: {
    cycles: number;
    kills: number;
    /** Kills by hunt task id. */
    hunts: Record<string, number>;
    /** Times a fight was abandoned because the survivor was too wounded. */
    retreats: number;
    /** Everything ever gained, by item. */
    produced: Bundle;
    creditsEarned: number;
    bounties: number;
  };
}

/** What one skill did while time passed. */
export interface SkillReport {
  /** Time spent working at it. */
  ms: number;
  cycles: number;
  xp: number;
  items: Bundle;
}

export interface Report {
  elapsedMs: number;
  cycles: number;
  items: Bundle;
  /** The part of `items` the drones brought back. */
  passive: Bundle;
  /** What each skill did, for the away summary. */
  skills: Partial<Record<SkillId, SkillReport>>;
  /** The part of `items` that came from rare drops. */
  rare: Bundle;
  xp: Partial<Record<SkillId, number>>;
  levelUps: { skill: SkillId; level: number }[];
  /** Story beats that happened while time passed. */
  notices: string[];
  /** Bounties finished while time passed. */
  bounties: { poster: string; marks: number; level?: number }[];
  stoppedReason?: string;
  /** Set when a fixed run or one-off craft finished by itself. */
  completed?: string;
}
