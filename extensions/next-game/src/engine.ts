// src/engine.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { GameCache } from "./types";

export type SessionIntent =
  | "Smart_Mix"
  | "Discover_New"
  | "Rediscover"
  | "Break_Mold"
  | "Mood_Story"
  | "Mood_Chill"
  | "Mood_Adrenaline"
  | "Mood_DeepDive"
  | "Mood_Infinite"
  | "Mood_Short"
  | "Mood_Puzzle"
  | "Mood_DeckAndDice"
  | "Mood_Sports"
  | "Mood_Horror"
  | "Mood_Fantasy"
  | "Mood_Retro"
  | "Social_Solo"
  | "Social_Coop"
  | "Social_Competitive";

export type ReasonId =
  | "TASTE_MATCH"
  | "FORGOTTEN_FAVORITE"
  | "WILDCARD"
  | "NEW_EXPERIENCE";

export type ReasonPayload =
  | { type: "TAG"; value: string }
  | { type: "DAYS"; value: number }
  | { type: "LABEL"; value: string };

export interface ScoredGame {
  game: GameCache;
  score: number;
  normalizedScore: number;
  percentile: number;
  matchPercent: number;
  reasonId: ReasonId;
  reasonPayload: ReasonPayload;
  topMatchedTraits: string[];
  novelTraits: string[];
  normalizedAllTraits: string[];
  unfilteredTraits: string[];
  isUnplayed: boolean;
  isForgotten: boolean;
  daysSince: number;
  anchorTag?: string;
  displayTraits: string[];
  fallbackMessage?: string;
}

export interface EnginePreferences {
  listLimit?: string;
  tasteTimeframe?: string;
  modeFilter?: string;
  maxAgeYears?: string;
  blacklistedTags?: string;
  requireController?: boolean;
  requireAchievements?: boolean;
  hideFreeToPlay?: boolean;
  vrFilter?: string;
  showOnlyInstalled?: boolean;
  [key: string]: any;
}

function toTitleCase(str: string): string {
  return str.replace(/(^|\s|-)([a-z])/gi, (c) => c.toUpperCase());
}

// 1. MODES AND METADATA
const BASE_IGNORE = [
  "multi-player",
  "single-player",
  "valve anti-cheat enabled",
  "co-op",
  "captions available",
  "commentary available",
  "stats",
  "includes source sdk",
  "includes level editor",
  "partial controller support",
  "mmo",
  "steam achievements",
  "steam cloud",
  "shared/split screen",
  "cross-platform multiplayer",
  "shared/split screen co-op",
  "full controller support",
  "steam trading cards",
  "steam workshop",
  "vr support",
  "tracked controller support",
  "vr only",
  "in-app purchases",
  "shared/split screen pvp",
  "steamvr collectibles",
  "remote play on phone",
  "remote play on tablet",
  "remote play on tv",
  "remote play together",
  "lan pvp",
  "lan co-op",
  "pvp",
  "steam turn notifications",
  "vr",
  "asymmetric vr",
  "native steam controller",
  "online pvp",
  "cloud gaming",
  "cloud gaming (nvidia)",
  "additional high-quality audio",
  "mods (require hl2)",
  "mods (require hl1)",
  "demos",
  "hdr available",
  "downloadable content",
  "steam leaderboards",
  "vr supported",
  "free to play",
  "massively multiplayer",
  "indie",
  "early access",
  "multiplayer",
  "singleplayer",
  "mmorpg",
  "asynchronous multiplayer",
  "esports",
  "competitive",
  "local co-op",
  "online co-op",
  "local multiplayer",
  "4 player local",
  "pve",
  "split screen",
  "demo available",
  "profile features limited",
  "co-op campaign",
  "hardware",
  "trackir",
  "voice control",
  "touch-friendly",
  "mouse only",
  "controller",
  "utilities",
  "design & illustration",
  "video production",
  "photo editing",
  "animation & modeling",
  "audio production",
  "education",
  "software training",
  "software",
  "360 video",
  "desktop companion",
  "ai content disclosed",
  "game development",
  "programming",
  "language learning",
  "benchmark",
  "level editor",
  "mod",
  "moddable",
  "memes",
  "intentionally awkward controls",
  "tutorial",
  "minigames",
  "nudity",
  "sexual content",
  "hentai",
  "adult content",
  "violent",
  "gore",
  "family friendly",
  "lgbtq+",
  "2d",
  "3d",
  "2.5d",
  "great soundtrack",
  "hand-drawn",
  "female protagonist",
  "soundtrack",
  "instrumental music",
  "rock music",
  "electronic music",
  "8-bit music",
  "stylized",
  "colorful",
  "beautiful",
  "cartoon",
  "cartoony",
  "minimalist",
  "voxel",
  "first-person",
  "first person",
  "third person",
  "third-person",
  "episodic",
  "sequel",
  "remake",
  "reboot",
  "experimental",
  "gaming",
  "difficult",
  "linear",
  "nonlinear",
];

const IGNORE_FOR_MOLD = new Set([
  ...BASE_IGNORE,
  "action",
  "adventure",
  "strategy",
  "rpg",
  "simulation",
  "sports",
  "racing",
  "shooter",
  "arcade",
  "puzzle",
]);

const TASTE_IGNORE_TRAITS = new Set([
  ...BASE_IGNORE,
  "music",
  "replay value",
  "based on a novel",
  "text-based",
  "old school",
  "cute",
  "realistic",
  "masterpiece",
  "epic",
  "addictive",
  "cult classic",
  "memes",
  "satire",
]);

export const SOFT_TRAITS = new Set([
  "atmospheric",
  "pixel graphics",
  "classic",
  "retro",
  "short",
  "funny",
  "comedy",
]);

export const TAG_GROUPS: Record<string, { group: string; display: string }> = {
  // Strategy & Tactics
  "turn-based strategy": {
    group: "turn-based strategy",
    display: "TB Strategy",
  },
  "real time strategy": { group: "rts", display: "RTS" },
  "real-time strategy": { group: "rts", display: "RTS" },
  "action rts": { group: "action rts", display: "Action RTS" },
  "real time tactics": { group: "real time tactics", display: "RT Tactics" },
  "turn-based tactics": { group: "turn-based tactics", display: "TB Tactics" },
  "grand strategy": { group: "grand strategy", display: "Grand Strat." },
  "4x": { group: "4x", display: "4X" },
  "tower defense": { group: "tower defense", display: "Tower Def." },
  moba: { group: "moba", display: "MOBA" },

  // RPGs
  crpg: { group: "crpg", display: "CRPG" },
  jrpg: { group: "jrpg", display: "JRPG" },
  "action rpg": { group: "action rpg", display: "ARPG" },
  "tactical rpg": { group: "tactical rpg", display: "Tactical RPG" },
  "strategy rpg": { group: "strategy rpg", display: "Strategy RPG" },
  "party-based rpg": { group: "party-based rpg", display: "PB RPG" },
  "mystery dungeon": { group: "mystery dungeon", display: "Myst. Dungeon" },
  "dungeon crawler": { group: "dungeon crawler", display: "Dun. Crawler" },

  // Mechanics & Combat
  "real-time with pause": { group: "rtwp", display: "RTwP" },
  "turn-based combat": { group: "turn-based combat", display: "TB Combat" },
  "hack and slash": { group: "hack and slash", display: "Hack & Slash" },
  "beat 'em up": { group: "beat 'em up", display: "Beat 'em Up" },
  "spectacle fighter": { group: "spectacle fighter", display: "Spec. Fighter" },
  "character action game": {
    group: "character action game",
    display: "Char. Action",
  },
  "shoot 'em up": { group: "shoot 'em up", display: "Shoot 'em Up" },
  "twin stick shooter": { group: "twin stick shooter", display: "Twin Stick" },
  "top-down shooter": { group: "top-down shooter", display: "Top-Down Shoot" },
  "third-person shooter": { group: "third-person shooter", display: "TPS" },
  "extraction shooter": {
    group: "extraction shooter",
    display: "Extract Shooter",
  },
  "quick-time events": { group: "quick-time events", display: "QT Events" },
  "action-adventure": { group: "action-adventure", display: "Action-Adv." },

  // Rogue-likes/lites & Survival
  "action roguelike": {
    group: "action roguelike",
    display: "Action Roguelike",
  },
  "roguelike deckbuilder": {
    group: "roguelike deckbuilder",
    display: "Rogue Deckbuilder",
  },
  "traditional roguelike": {
    group: "traditional roguelike",
    display: "Trad. Roguelike",
  },
  "perma death": { group: "permadeath", display: "Permadeath" },
  "open world survival craft": {
    group: "survival craft",
    display: "Survival Craft",
  },
  "survival horror": { group: "survival horror", display: "Surv. Horror" },
  "base building": { group: "base building", display: "Base Building" },

  // Platformers & Puzzles
  "precision platformer": {
    group: "precision platformer",
    display: "Prec. Platform.",
  },
  "puzzle platformer": { group: "puzzle platformer", display: "Puzzle Plat." },
  "2d platformer": { group: "2d platformer", display: "2D Platformer" },
  "3d platformer": { group: "3d platformer", display: "3D Platfomer" },
  "point & click": { group: "point & click", display: "P&C" },

  // Narrative & Atmosphere
  "walking simulator": { group: "walking simulator", display: "Walking Sim" },
  "multiple endings": { group: "multiple endings", display: "Multi Ending" },
  "choose your own adventure": { group: "cyoa", display: "CYOA" },
  "interactive fiction": {
    group: "interactive fiction",
    display: "Inter. Fiction",
  },
  "dynamic narration": {
    group: "dynamic narration",
    display: "Dyn. Narrative",
  },
  "based on a novel": { group: "based on a novel", display: "Based on Novel" },
  "psychological horror": {
    group: "psychological horror",
    display: "Psych. Horror",
  },
  "post-apocalyptic": { group: "post-apocalyptic", display: "Post-Apoc." },
  "alternate history": { group: "alternate history", display: "Alt. History" },
  "world war i": { group: "world war i", display: "WWI" },
  "world war ii": { group: "world war ii", display: "WWII" },
  "sci-fi": { group: "sci-fi", display: "Sci-Fi" },

  // Sims & Management
  "job simulator": { group: "job sim", display: "Job Sim" },
  "automobile sim": { group: "car sim", display: "Car Sim" },
  "political sim": { group: "political sim", display: "Politic. Sim" },
  "resource management": {
    group: "resource management",
    display: "Resource Mgmt",
  },
  "inventory management": {
    group: "inventory management",
    display: "Inventory Mgmt",
  },
  "time management": { group: "time management", display: "Time Mgmt" },

  // Multiplayer & Meta
  "massively multiplayer": { group: "mmo", display: "MMO" },
  mmorpg: { group: "mmorpg", display: "MMORPG" },
  "free to play": { group: "free to play", display: "F2P" },

  // Cards & Sports
  "trading card game": { group: "trading card game", display: "TCG" },
  "football (soccer)": { group: "football (soccer)", display: "Football" },
  "football (american)": {
    group: "football (american)",
    display: "Am. Football",
  },

  // Misc Categories & Attributes
  "procedural generation": { group: "procedural", display: "Procedural" },
  "music-based procedural generation": {
    group: "music-based procedural generation",
    display: "Music Gen.",
  },
  "8-bit music": { group: "8-bit music", display: "8-bit Music" },
  "pixel graphics": { group: "pixel graphics", display: "Pixel Graph." },
  "hand-drawn": { group: "hand-drawn", display: "Hand-Drawn" },
  "character customization": {
    group: "character customization",
    display: "Char. Custom.",
  },
  "gun customization": { group: "gun customization", display: "Gun Custom." },
  "female protagonist": {
    group: "female protagonist",
    display: "Female Prot.",
  },
  "silent protagonist": {
    group: "silent protagonist",
    display: "Silent Prot.",
  },
  "villain protagonist": {
    group: "villain protagonist",
    display: "Villain Prot.",
  },
  "intentionally awkward controls": {
    group: "intentionally awkward controls",
    display: "Awkward Controls",
  },

  // Non-Game / Software
  "game development": { group: "game development", display: "Game Dev" },

  // Other
  rtwp: { group: "rtwp", display: "RTwP" },
  rts: { group: "rts", display: "RTS" },
  mmo: { group: "mmo", display: "MMO" },
  fmv: { group: "fmv", display: "FMV" },
  pvp: { group: "pvp", display: "PvP" },
  pve: { group: "pve", display: "PvE" },
  cyoa: { group: "cyoa", display: "CYOA" },
  arpg: { group: "action rpg", display: "ARPG" },
  fps: { group: "fps", display: "FPS" },
  rpg: { group: "rpg", display: "RPG" },
  tps: { group: "third-person shooter", display: "TPS" },
  tcg: { group: "trading card game", display: "TCG" },
  vn: { group: "visual novel", display: "VN" },

  // Generics (Strict formatting overrides)
  "first-person": { group: "first person", display: "1st Person" },
  "third person": { group: "third person", display: "3rd Person" },
  "2d": { group: "2d", display: "2D" },
  "3d": { group: "3d", display: "3D" },
  "2.5d": { group: "2.5d", display: "2.5D" },
  vr: { group: "vr", display: "VR" },
};

const normalizeTag = (t: string) => {
  const lower = t.toLowerCase();
  return TAG_GROUPS[lower]?.group || lower;
};

export const BROAD_TAGS = new Set([
  "action",
  "adventure",
  "strategy",
  "rpg",
  "indie",
  "sports",
  "difficult",
  "simulation",
  "casual",
  "mmo",
  "shooter",
  "puzzle",
  "survival",
  "arcade",
  "fps",
  "fantasy",

  "open world",
  "management",
  "turn-based",
  "sandbox",
  "story rich",
  "relaxing",

  "great soundtrack",
  "classic",
  "retro",
  "dark fantasy",
  "funny",
  "sci-fi",
  "pixel graphics",
  "colorful",
  "stylized",
  "realistic",
  "violent",
  "gore",
  "family friendly",
  "cute",
  "comedy",
  "anime",
  "cartoony",
  "cartoon",
  "beautiful",

  "2d",
  "3d",
  "2.5d",
  "first-person",
  "third person",
  "top-down",
  "isometric",
  "side scroller",
  "atmospheric",
  "exploration",
  "action-adventure",

  "singleplayer",
  "single-player",
  "multiplayer",
  "co-op",
  "massively multiplayer",
  "free to play",
  "early access",
  "pvp",
  "pve",
  "local co-op",
  "online co-op",
  "local multiplayer",
  "controller",
  "replay value",
  "short",
  "sequel",
  "remake",
  "moddable",
  "e-sports",
  "esports",
  "competitive",

  "female protagonist",
  "character customization",
  "linear",
  "nonlinear",
  "lore-rich",
  "multiple endings",
  "choices matter",
  "tutorial",
  "physics",
  "vr",
]);

const TAG_HIERARCHY: Record<string, string[]> = {
  // RPGs
  "dark fantasy": ["fantasy"],
  "action rpg": ["rpg", "action"],
  crpg: ["rpg"],
  jrpg: ["rpg"],
  "tactical rpg": ["rpg", "tactical", "strategy"],
  "strategy rpg": ["rpg", "strategy"],
  "party-based rpg": ["rpg", "party"],
  "mystery dungeon": ["rpg", "dungeon crawler", "roguelike"],

  // Strategy & Tactics
  "turn-based strategy": ["strategy", "turn-based"],
  "real time strategy": ["strategy", "real-time"],
  "grand strategy": ["strategy"],
  "4x": ["strategy", "grand strategy", "turn-based strategy"],
  "action rts": ["rts", "strategy", "action", "real-time"],
  "real time tactics": ["strategy", "tactical", "real-time"],
  "turn-based tactics": ["strategy", "tactical", "turn-based"],
  "tower defense": ["strategy"],
  wargame: ["strategy", "military", "war"],
  moba: ["strategy", "action", "pvp", "multiplayer", "team-based"],
  "auto battler": ["strategy", "tactical"],
  "base building": ["strategy", "simulation", "building"],
  "turn-based combat": ["turn-based", "combat"],

  // Shooters
  fps: ["shooter", "first-person"],
  "third-person shooter": ["shooter", "action", "third person"],
  "hero shooter": ["shooter", "action", "fps", "class-based"],
  "arena shooter": ["shooter", "action", "fps", "fast-paced"],
  "boomer shooter": ["shooter", "action", "fps", "retro", "old school"],
  "extraction shooter": ["shooter", "action", "multiplayer", "pvp"],
  "looter shooter": ["shooter", "action", "loot"],
  "top-down shooter": ["shooter", "action", "top-down"],
  "twin stick shooter": ["shooter", "action", "top-down"],
  "on-rails shooter": ["shooter", "action"],
  "shoot 'em up": ["shooter", "action"],
  "bullet hell": ["shooter", "action", "shoot 'em up"],
  "bullet heaven": ["shooter", "action", "shoot 'em up"],

  // Action & Fighting
  "action-adventure": ["action", "adventure", "action adventure"],
  "2d fighter": ["fighting", "action", "2d"],
  "3d fighter": ["fighting", "action", "3d"],
  "spectacle fighter": [
    "action",
    "hack and slash",
    "fighting",
    "character action game",
  ],
  "beat 'em up": ["action", "fighting"],
  "souls-like": ["action rpg", "rpg", "action", "difficult"],
  "character action game": ["action", "character action", "hack and slash"],

  // Platformers
  "puzzle platformer": [
    "puzzle",
    "platformer",
    "2d platformer",
    "3d platformer",
    "puzzle-platformer",
  ],
  "precision platformer": ["platformer", "difficult"],
  "2d platformer": ["platformer", "2d"],
  "3d platformer": ["platformer", "3d"],
  metroidvania: [
    "platformer",
    "action-adventure",
    "action",
    "adventure",
    "exploration",
  ],

  // Roguelikes
  "action roguelike": ["roguelike", "action", "roguelite"],
  "roguelike deckbuilder": [
    "roguelike",
    "deckbuilding",
    "card game",
    "strategy",
    "deckbuilder",
  ],
  "traditional roguelike": ["roguelike", "turn-based", "rpg"],
  roguelite: ["roguelike"],

  // Horror
  "survival horror": ["survival", "horror"],
  "psychological horror": ["horror", "psychological"],
  lovecraftian: ["horror"],

  // Sims
  "walking simulator": ["simulation", "adventure", "exploration"],
  "farming sim": ["simulation", "farming", "agriculture"],
  "city builder": ["simulation", "management", "building"],
  "colony sim": ["simulation", "management", "base building"],
  "automobile sim": ["simulation", "driving", "racing"],
  "space sim": ["simulation", "space", "flight"],
  flight: ["simulation"],
  "medical sim": ["simulation"],
  "political sim": ["simulation", "politics", "political"],
  "life sim": ["simulation"],
  "hobby sim": ["simulation"],
  "job simulator": ["simulation"],
  "outbreak sim": ["simulation", "strategy", "management"],
  "immersive sim": ["simulation", "rpg", "first-person", "immersive"],

  // Puzzle & Casual
  "match 3": ["puzzle", "casual"],
  sokoban: ["puzzle"],
  "hidden object": ["puzzle", "casual", "point & click"],
  "escape room": ["puzzle", "adventure", "mystery"],
  "word game": ["puzzle", "spelling", "trivia"],
  "music-based procedural generation": ["procedural generation", "music"],

  // Narrative
  "visual novel": ["adventure", "story rich", "narrative"],
  "choose your own adventure": [
    "adventure",
    "story rich",
    "narrative",
    "choices matter",
  ],
  "interactive fiction": ["adventure", "story rich", "narrative", "text-based"],
  "dating sim": ["simulation", "romance", "visual novel"],
  "story rich": ["story", "narrative"],

  // Sports & Racing
  "combat racing": ["racing", "action", "combat", "vehicular combat"],
  "football (soccer)": ["sports", "football"],
  "football (american)": ["sports", "football"],
  basketball: ["sports"],
  golf: ["sports"],
  "mini golf": ["sports", "golf"],
  bowling: ["sports"],
  boxing: ["sports", "fighting", "martial arts"],
  wrestling: ["sports", "fighting", "martial arts"],
  rugby: ["sports"],
  baseball: ["sports"],
  hockey: ["sports"],
  tennis: ["sports"],
  cycling: ["sports", "bikes"],
  motocross: ["sports", "racing", "bikes", "motorbike", "offroad"],
  volleyball: ["sports"],
  cricket: ["sports"],
  skateboarding: ["sports", "skating"],
  snowboarding: ["sports", "snow"],
  skiing: ["sports", "snow"],

  // Multiplayer & Meta
  mmorpg: ["mmo", "rpg", "massively multiplayer", "multiplayer"],
  "battle royale": ["shooter", "action", "multiplayer", "pvp", "survival"],
  "open world survival craft": [
    "survival",
    "crafting",
    "open world",
    "exploration",
    "sandbox",
  ],
  "online co-op": ["co-op", "multiplayer", "online"],
  "local co-op": ["co-op", "multiplayer", "local", "local multiplayer"],
  "online pvp": ["pvp", "multiplayer", "online", "competitive"],
  "local multiplayer": ["multiplayer", "local"],
  "4 player local": ["local multiplayer", "multiplayer", "local", "co-op"],
  "vr supported": ["vr"],
  "vr only": ["vr"],
  "asymmetric vr": ["vr", "multiplayer", "local multiplayer"],

  // Cards / Boards
  "trading card game": ["card game", "trading"],
  "card battler": ["card game", "strategy"],

  // Themes
  cyberpunk: ["sci-fi"],
  steampunk: ["sci-fi"],
  "post-apocalyptic": ["sci-fi"],
  "world war ii": ["historical", "war", "military"],
  "world war i": ["historical", "war", "military"],
  "cold war": ["historical", "war", "military"],

  // Others
  musou: ["action", "hack and slash", "beat 'em up"],
  otome: ["visual novel", "romance", "dating sim", "adventure"],
  xianxia: ["rpg", "martial arts", "fantasy"],
  wuxia: ["rpg", "martial arts", "fantasy"],
  "creature collector": ["rpg", "collection"],
  "social deduction": ["multiplayer", "party", "strategy"],
  "boss rush": ["action", "difficult"],
  "time attack": ["arcade", "action", "score attack"],
  "score attack": ["arcade", "action"],
};

export function removeRedundantTags(tags: string[]): string[] {
  const tagSet = new Set(tags);
  const toRemove = new Set<string>();

  for (const tag of tagSet) {
    if (TAG_HIERARCHY[tag]) {
      for (const parent of TAG_HIERARCHY[tag]) {
        toRemove.add(parent);
      }
    }
  }

  return tags.filter((t) => !toRemove.has(t));
}

export const MOOD_DEFINITIONS: Record<
  string,
  { positive: string[]; negative: string[] }
> = {
  Mood_Story: {
    positive: [
      "Story Rich",
      "Lore-Rich",
      "Cinematic",
      "FMV",
      "Dating Sim",
      "Narrative",
      "Visual Novel",
      "Interactive Fiction",
      "Walking Simulator",
      "Emotional",
      "Detective",
      "Comic Book",
      "Dialogue Heavy",
      "Choose Your Own Adventure",
      "Based On A Novel",
      "Romance",
      "Investigation",
      "Dynamic Narration",
      "Choices Matter",
      "CRPG",
      "JRPG",
      "Text-Based",
      "Otome",
    ],
    negative: [
      "Match 3",
      "Action Roguelike",
      "Fighting",
      "Sports",
      "Racing",
      "eSports",
      "Memes",
      "Hentai",
      "Sexual Content",
      "Adult Content",
      "Nudity",
      "Sandbox",
      "Battle Royale",
      "Auto Battler",
    ],
  },
  Mood_Chill: {
    positive: [
      "Relaxing",
      "Cozy",
      "Casual",
      "Wholesome",
      "Cute",
      "Family Friendly",
      "Idler",
      "Farming Sim",
      "City Builder",
      "Base Building",
      "Incremental",
      "Agriculture",
      "Comedy",
      "Hobby Sim",
      "Nature",
      "Hidden Object",
      "Fishing",
      "Cleaning",
      "Decorating",
      "Shop Keeper",
      "Minigames",
    ],
    negative: [
      "FPS",
      "Hack and Slash",
      "Horror",
      "Crime",
      "Psychological Horror",
      "Survival Horror",
      "Souls-like",
      "Difficult",
      "Competitive",
      "eSports",
      "Action Roguelike",
      "Bullet Hell",
      "Spectacle fighter",
      "MOBA",
      "War",
      "Violent",
      "Military",
      "Memes",
      "Hentai",
      "Sexual Content",
      "Adult Content",
      "Nudity",
      "Gore",
      "Thriller",
      "Jump Scare",
      "Dark",
      "Dark Fantasy",
      "Dark Humor",
      "Battle Royale",
      "Survival",
    ],
  },
  Mood_Adrenaline: {
    positive: [
      "Fast-Paced",
      "Action",
      "Combat",
      "Dungeon Crawler",
      "Shoot 'Em Up",
      "Souls-like",
      "Spectacle fighter",
      "FPS",
      "Shooter",
      "Character Action Game",
      "Bullet Hell",
      "Hack and Slash",
      "Action Roguelike",
      "Twin Stick Shooter",
      "Battle Royale",
      "Action-Adventure",
      "Vehicular Combat",
      "Parkour",
      "On-Rails Shooter",
      "Extraction Shooter",
      "Top-Down Shooter",
      "Bullet Heaven",
      "Hero Shooter",
      "Combat Racing",
      "Action RTS",
      "Arena Shooter",
      "Action RPG",
      "Third-Person Shooter",
      "Boomer Shooter",
      "Looter Shooter",
      "Fighting",
      "2D Fighter",
      "3D Fighter",
      "Beat 'em up",
      "Metroidvania",
      "Musou",
      "Score Attack",
      "Time Attack",
      "Boss Rush",
      "Swordplay",
      "Martial Arts",
    ],
    negative: [
      "Walking Simulator",
      "Hidden Object",
      "Cozy",
      "Relaxing",
      "Visual Novel",
      "Turn-Based Strategy",
      "Turn-Based Tactics",
      "Turn-Based Combat",
      "Turn-Based",
      "Farming Sim",
      "Point & Click",
      "Puzzle",
      "Memes",
      "Hentai",
      "Sexual Content",
      "Adult Content",
      "Nudity",
      "Idler",
      "Incremental",
      "Text-Based",
      "Dating Sim",
      "Interactive Fiction",
      "Golf",
      "Mini Golf",
    ],
  },
  Mood_DeepDive: {
    positive: [
      "RPG",
      "Grand Strategy",
      "4X",
      "CRPG",
      "Base Building",
      "Tactical RPG",
      "Strategy RPG",
      "Turn-Based Strategy",
      "City Builder",
      "Management",
      "Automation",
      "Colony Sim",
      "Economy",
      "Simulation",
      "Immersive",
      "Immersive Sim",
      "Space Sim",
      "RTS",
      "Open World Survival Craft",
      "Life Sim",
      "Political Sim",
      "Medical Sim",
      "Wargame",
      "Turn-Based Tactics",
      "Real Time Tactics",
      "JRPG",
      "Party-Based RPG",
      "Hex Grid",
      "Resource Management",
      "Inventory Management",
      "Diplomacy",
      "Capitalism",
    ],
    negative: [
      "Short",
      "Arcade",
      "Casual",
      "Hidden Object",
      "Match 3",
      "Visual Novel",
      "Walking Simulator",
      "Party Game",
      "Party",
      "Linear",
      "Racing",
      "Memes",
      "Hentai",
      "Sexual Content",
      "Adult Content",
      "Nudity",
      "Minigames",
      "Idler",
      "Auto Battler",
    ],
  },
  Mood_Infinite: {
    positive: [
      "Survival",
      "Dungeon Crawler",
      "Crafting",
      "Tabletop",
      "Roguelike",
      "Deckbuilding",
      "Automation",
      "Procedural Generation",
      "Sandbox",
      "Replay Value",
      "Roguelite",
      "Roguelike Deckbuilder",
      "Immersive Sim",
      "Incremental",
      "Action Roguelike",
      "Traditional Roguelike",
      "MMORPG",
      "MMO",
      "Looter Shooter",
    ],
    negative: [
      "Linear",
      "Visual Novel",
      "Short",
      "Walking Simulator",
      "FMV",
      "Episodic",
      "Story Rich",
      "Memes",
      "Hentai",
      "Sexual Content",
      "Adult Content",
      "Nudity",
      "Cinematic",
      "Quick-Time Events",
      "Interactive Fiction",
    ],
  },
  Mood_Short: {
    positive: [
      "Roguelite",
      "Roguelike",
      "Traditional Roguelike",
      "Action Roguelike",
      "Short",
      "Arcade",
      "Party Game",
      "Minigames",
      "Time Attack",
      "Score Attack",
      "Boss Rush",
    ],
    negative: [
      "Open World",
      "RPG",
      "MMO",
      "MMORPG",
      "Massively Multiplayer",
      "Grand Strategy",
      "4X",
      "Base Building",
      "Memes",
      "Hentai",
      "Sexual Content",
      "Adult Content",
      "Nudity",
      "CRPG",
      "JRPG",
      "Story Rich",
      "Lore-Rich",
    ],
  },
  Mood_Puzzle: {
    positive: [
      "Puzzle",
      "Logic",
      "Sokoban",
      "Trivia",
      "Board Game",
      "Mind-Bending",
      "Word Game",
      "Match 3",
      "Puzzle Platformer",
      "Escape Room",
      "Solitaire",
      "Chess",
      "Spelling",
      "Programming",
    ],
    negative: [
      "Fighting",
      "Hack and Slash",
      "eSports",
      "Memes",
      "Hentai",
      "Sexual Content",
      "Adult Content",
      "Nudity",
      "Action RPG",
      "Shooter",
      "Battle Royale",
      "Fast-Paced",
    ],
  },
  Mood_Horror: {
    positive: [
      "Horror",
      "Psychological Horror",
      "Survival Horror",
      "Lovecraftian",
      "Dark",
      "Zombies",
      "Thriller",
      "Jump Scare",
      "Gore",
      "Violent",
      "Supernatural",
      "Cult",
    ],
    negative: [
      "Cozy",
      "Family Friendly",
      "Wholesome",
      "Cute",
      "Relaxing",
      "Comedy",
      "Funny",
      "Satire",
      "Parody",
      "Colorful",
      "Cartoon",
      "Memes",
      "Hentai",
      "Sexual Content",
      "Adult Content",
      "Nudity",
    ],
  },
  Mood_Fantasy: {
    positive: [
      "Fantasy",
      "Dark Fantasy",
      "Magic",
      "Dragons",
      "Dwarves",
      "Mythology",
      "Vampire",
      "Vampires",
      "Werewolves",
      "Demons",
      "Dungeon Crawler",
      "Elves",
      "Xianxia",
      "Wuxia",
    ],
    negative: [
      "Sci-fi",
      "Cyberpunk",
      "Space",
      "Modern",
      "Post-apocalyptic",
      "Aliens",
      "Futuristic",
      "World War II",
      "World War I",
      "Cold War",
      "Military",
      "Hacking",
      "Mechs",
      "Zombies",
      "Crime",
      "Heist",
      "Memes",
      "Hentai",
      "Sexual Content",
      "Adult Content",
      "Nudity",
    ],
  },
  Mood_DeckAndDice: {
    positive: [
      "Card Game",
      "Deckbuilding",
      "Card Battler",
      "Roguelike Deckbuilder",
      "Solitaire",
      "Party Game",
      "Trading Card Game",
      "Dice",
      "Board Game",
      "Tabletop",
      "Auto Battler",
      "Chess",
      "Mahjong",
      "Poker",
      "Gambling",
    ],
    negative: [
      "FPS",
      "Shooter",
      "Racing",
      "Spectacle fighter",
      "Action-Adventure",
      "Platformer",
      "Hack and Slash",
      "Memes",
      "Hentai",
      "Sexual Content",
      "Adult Content",
      "Nudity",
    ],
  },
  Mood_Retro: {
    positive: [
      "Retro",
      "Pixel Graphics",
      "Nostalgia",
      "8-bit Music",
      "1990s",
      "1990's",
      "1980s",
      "90s",
      "80s",
      "Classic",
      "Old School",
    ],
    negative: [
      "Realistic",
      "Cinematic",
      "FMV",
      "VR",
      "Modern",
      "Memes",
      "Hentai",
      "Sexual Content",
      "Adult Content",
      "Nudity",
    ],
  },
  Mood_Sports: {
    positive: [
      "Sports",
      "Racing",
      "Football",
      "Basketball",
      "Golf",
      "Skiing",
      "Snowboarding",
      "Skateboarding",
      "Mini Golf",
      "Bowling",
      "Boxing",
      "Wrestling",
      "Football (Soccer)",
      "Snooker",
      "Rugby",
      "Baseball",
      "Hockey",
      "Football (American)",
      "Tennis",
      "Cycling",
      "Motocross",
      "Volleyball",
      "Cricket",
      "BMX",
      "ATV",
      "Bikes",
      "Motorbike",
      "Billiards",
    ],
    negative: [
      "Story Rich",
      "Transportation",
      "Visual Novel",
      "Third-Person Shooter",
      "FPS",
      "Hidden Object",
      "Survival",
      "Horror",
      "Walking Simulator",
      "Psychological Horror",
      "Bullet Hell",
      "Turn-Based",
      "CRPG",
      "Grand Strategy",
      "Memes",
      "Hentai",
      "Sexual Content",
      "Adult Content",
      "Nudity",
      "eSports",
    ],
  },
};

export function formatTotalPlaytime(minutes: number): string {
  if (minutes === 0) return "0h";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h >= 100) return m > 0 ? `${h}h+` : `${h}h`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// -------------------------------------------------------------
// SEEDED RANDOMNESS
// -------------------------------------------------------------
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  const rng = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// -------------------------------------------------------------
// CREATING PROFILE & SCORING
// -------------------------------------------------------------
function buildTasteProfile(
  cache: GameCache[],
  timeframeDays: number,
  nowMs: number,
): Map<string, number> {
  const profile = new Map<string, number>();

  for (const g of cache) {
    if (g.playtime === 0) continue;
    const daysSince = g.lastPlayedAt
      ? (nowMs - g.lastPlayedAt) / 86400000
      : 999;
    let recencyWeight = 1.0;

    if (timeframeDays > 0) {
      let tailEnd = 180;
      if (timeframeDays === 180) tailEnd = 365;
      if (timeframeDays === 365) tailEnd = 730;

      if (daysSince <= timeframeDays) {
        recencyWeight = 1.0 + 0.2 * Math.pow(1 - daysSince / timeframeDays, 2);
      } else if (daysSince <= tailEnd) {
        const tailLength = tailEnd - timeframeDays;
        const daysIntoTail = daysSince - timeframeDays;
        recencyWeight = Math.pow(1 - daysIntoTail / tailLength, 2);
      } else {
        recencyWeight = 0;
      }
    } else {
      recencyWeight = Math.pow(0.8, daysSince / 1095);
    }

    const cappedPlaytime = Math.min(g.playtime, 18000);
    const playtimeWeight = 1 + Math.pow(cappedPlaytime / 60, 0.5);
    const finalWeight = recencyWeight * playtimeWeight;

    const addTraits = (traits: string[] | undefined, multiplier: number) => {
      if (!traits) return;
      const normalized = traits.map((t) => normalizeTag(t.toLowerCase()));
      for (const norm of normalized) {
        if (TASTE_IGNORE_TRAITS.has(norm)) continue;
        const appliedMultiplier =
          BROAD_TAGS.has(norm) || SOFT_TRAITS.has(norm)
            ? multiplier * 0.3
            : multiplier;
        profile.set(
          norm,
          (profile.get(norm) || 0) + finalWeight * appliedMultiplier,
        );

        const parents = TAG_HIERARCHY[norm];
        if (parents) {
          for (const parent of parents) {
            const parentNorm = normalizeTag(parent);
            profile.set(
              parentNorm,
              (profile.get(parentNorm) || 0) + finalWeight * multiplier * 0.3,
            );
          }
        }
      }
    };

    addTraits(g.tags, 1.5);
    addTraits(g.genres, 1.0);
    addTraits(g.categories, 0.5);
  }

  let maxProfileValue = 0;
  for (const val of profile.values()) {
    if (val > maxProfileValue) maxProfileValue = val;
  }
  if (maxProfileValue > 0) {
    for (const [key, val] of profile.entries())
      profile.set(key, val / maxProfileValue);
  }
  return profile;
}

function scoreGameAgainstProfile(
  game: GameCache,
  profile: Map<string, number>,
): {
  score: number;
  topMatchedTraits: string[];
  novelTraits: string[];
  anchorTag: string;
} {
  if (profile.size === 0)
    return {
      score: 0,
      topMatchedTraits: [],
      novelTraits: [],
      anchorTag: "general",
    };
  const traitContributions = new Map<string, number>();

  const uniqueRawTraits = new Map<string, number>();

  const checkTraits = (traits: string[] | undefined, multiplier: number) => {
    if (!traits) return;
    const normalized = traits.map((t) => normalizeTag(t.toLowerCase()));
    for (const norm of normalized) {
      if (TASTE_IGNORE_TRAITS.has(norm)) continue;
      const appliedMultiplier =
        BROAD_TAGS.has(norm) || SOFT_TRAITS.has(norm)
          ? multiplier * 0.3
          : multiplier;
      uniqueRawTraits.set(
        norm,
        Math.max(uniqueRawTraits.get(norm) || 0, appliedMultiplier),
      );
    }
  };

  checkTraits(game.tags, 1.5);
  checkTraits(game.genres, 1.0);
  checkTraits(game.categories, 0.5);

  const traitScores: number[] = [];
  for (const [trait, multiplier] of uniqueRawTraits.entries()) {
    const traitScore = profile.get(trait) || 0;
    const added = traitScore * multiplier;
    if (added > 0) {
      traitScores.push(added);
      traitContributions.set(
        trait,
        (traitContributions.get(trait) || 0) + added,
      );
    }
  }

  traitScores.sort((a, b) => b - a);
  const finalScore = traitScores.slice(0, 8).reduce((sum, val) => sum + val, 0);

  const rawSortedTraits = Array.from(traitContributions.entries())
    .sort((a, b) => b[1] - a[1])
    .filter((e) => !e[0].startsWith("dev:"));

  let topMatchedTraits: string[] = [];

  if (rawSortedTraits.length > 0) {
    const maxScore = rawSortedTraits[0][1];

    const threshold = maxScore * 0.1;

    const top3Tags = new Set(rawSortedTraits.slice(0, 3).map((e) => e[0]));

    const meaningful = rawSortedTraits.filter(
      (e) => e[1] >= threshold || top3Tags.has(e[0]),
    );
    const weak = rawSortedTraits.filter(
      (e) => e[1] < threshold && !top3Tags.has(e[0]),
    );

    const meaningfulSpecific = meaningful.filter((e) => !BROAD_TAGS.has(e[0]));
    const meaningfulBroad = meaningful.filter((e) => BROAD_TAGS.has(e[0]));

    topMatchedTraits = [
      ...meaningfulSpecific.map((e) => e[0]),
      ...meaningfulBroad.map((e) => e[0]),
      ...weak.map((e) => e[0]),
    ];
  }

  const novelTraits = Array.from(uniqueRawTraits.keys())
    .filter((t) => !t.startsWith("dev:"))
    .sort((a, b) => (profile.get(a) || 0) - (profile.get(b) || 0));

  const anchorTag =
    topMatchedTraits.length > 0 ? topMatchedTraits[0] : "general";

  return {
    score: finalScore,
    topMatchedTraits: topMatchedTraits.slice(0, 6),
    novelTraits: novelTraits.slice(0, 6),
    anchorTag,
  };
}

const getContextualTraits = (
  c: ScoredGame,
  currentIntent: SessionIntent,
  tasteProfile?: Map<string, number>,
) => {
  const allTags = c.normalizedAllTraits || [];

  const ignoreSet = new Set([
    "multi-player",
    "single-player",
    "valve anti-cheat enabled",
    "co-op",
    "captions available",
    "commentary available",
    "stats",
    "includes source sdk",
    "includes level editor",
    "partial controller support",
    "mmo",
    "steam achievements",
    "steam cloud",
    "shared/split screen",
    "cross-platform multiplayer",
    "shared/split screen co-op",
    "full controller support",
    "steam trading cards",
    "steam workshop",
    "vr support",
    "tracked controller support",
    "vr only",
    "in-app purchases",
    "shared/split screen pvp",
    "steamvr collectibles",
    "remote play on phone",
    "remote play on tablet",
    "remote play on tv",
    "remote play together",
    "lan pvp",
    "lan co-op",
    "pvp",
    "steam turn notifications",
    "vr",
    "asymmetric vr",
    "native steam controller",
    "online pvp",
    "cloud gaming",
    "cloud gaming (nvidia)",
    "additional high-quality audio",
    "mods (require hl2)",
    "mods (require hl1)",
    "demos",
    "hdr available",
    "downloadable content",
    "steam leaderboards",
    "vr supported",

    "free to play",
    "massively multiplayer",
    "indie",
    "early access",
    "multiplayer",
    "singleplayer",
    "mmorpg",
    "asynchronous multiplayer",
    "esports",
    "competitive",
    "local co-op",
    "online co-op",
    "local multiplayer",
    "4 player local",
    "pve",
    "split screen",
    "demo available",
    "profile features limited",
    "first-person",
    "first person",
    "third person",
    "third-person",
    "e-sports",
    "e sports",

    "action",
    "adventure",
    "strategy",
    "rpg",
    "simulation",
    "sports",
    "racing",
    "shooter",
    "arcade",
    "puzzle",

    "hardware",
    "trackir",
    "voice control",
    "touch-friendly",
    "mouse only",
    "controller",

    "utilities",
    "design & illustration",
    "video production",
    "photo editing",
    "animation & modeling",
    "audio production",
    "education",
    "software training",
    "software",
    "360 video",
    "desktop companion",
    "ai content disclosed",
    "game development",
    "programming",
    "language learning",
    "benchmark",
    "level editor",
    "mod",
    "moddable",

    "memes",
    "intentionally awkward controls",
    "tutorial",
    "minigames",
    "nudity",
    "sexual content",
    "hentai",
    "adult content",
    "violent",
    "gore",
    "family friendly",
    "lgbtq+",

    "2d",
    "3d",
    "2.5d",
    "great soundtrack",
    "hand-drawn",
    "female protagonist",
    "soundtrack",
    "instrumental music",
    "rock music",
    "electronic music",
    "8-bit music",
    "stylized",
    "colorful",
    "beautiful",
    "cartoon",
    "cartoony",
    "minimalist",
    "voxel",

    "episodic",
    "sequel",
    "remake",
    "reboot",
    "experimental",
    "gaming",
    "difficult",
    "linear",
    "nonlinear",
    "epic",
    "addictive",
    "masterpiece",
  ]);

  const validTags = allTags.filter((t) => !ignoreSet.has(t));
  let chosenTags: string[] = [];

  if (currentIntent === "Break_Mold" && tasteProfile) {
    const scoredTags = validTags.map((t) => ({
      tag: t,
      score: tasteProfile.get(t) || 0,
    }));
    scoredTags.sort((a, b) => a.score - b.score);

    const strictlyNovel = scoredTags
      .filter((t) => t.score <= 0.01)
      .map((t) => t.tag);

    if (strictlyNovel.length >= 2) {
      chosenTags.push(strictlyNovel[0], strictlyNovel[1]);
    } else if (strictlyNovel.length === 1) {
      chosenTags.push(strictlyNovel[0]);
    } else {
      const somewhatNovel = scoredTags
        .filter((t) => t.score < 0.04)
        .map((t) => t.tag);
      if (somewhatNovel.length > 0) {
        chosenTags.push(...somewhatNovel.slice(0, 2));
      }
    }
  } else {
    const moodTargets =
      MOOD_DEFINITIONS[currentIntent]?.positive?.map(normalizeTag) || [];
    const userFavorites = (c.topMatchedTraits || []).map(normalizeTag);

    chosenTags = validTags.filter((t) => moodTargets.includes(t));
    if (chosenTags.length < 2) {
      const matchingFavs = validTags.filter(
        (t) => userFavorites.includes(t) && !chosenTags.includes(t),
      );
      chosenTags.push(...matchingFavs);
    }
    if (chosenTags.length < 2) {
      const remaining = validTags.filter((t) => !chosenTags.includes(t));
      chosenTags.push(...remaining);
    }
  }

  const displayTags = chosenTags.slice(0, 2).map((t) => {
    return TAG_GROUPS[t]?.display || toTitleCase(t);
  });

  return Array.from(new Set(displayTags)).join(", ") || "New Mechanics";
};

// -------------------------------------------------------------
// MAIN ENGINE
// -------------------------------------------------------------
export function getRecommendations(
  cache: GameCache[],
  limit: number,
  intent: SessionIntent = "Smart_Mix",
  timeframe: string = "180",
  skippedGames: Record<number, any> = {},
  prefs: EnginePreferences = {},
  refreshKey: number = 0,
): ScoredGame[] {
  const nowMs = Date.now();
  let timeframeDays = timeframe === "all" ? 0 : parseInt(timeframe, 10) || 180;

  let fallbackMessage: string | undefined = undefined;

  if (timeframeDays > 0) {
    const thresholds = [90, 180, 365, 0];
    let currentIdx = thresholds.indexOf(timeframeDays);
    if (currentIdx === -1) currentIdx = 0;

    for (let i = currentIdx; i < thresholds.length; i++) {
      const t = thresholds[i];
      if (t === 0) {
        if (timeframeDays !== 0) {
          fallbackMessage = `Not enough recent data. Automatically expanded to All-Time preferences.`;
          timeframeDays = 0;
        }
        break;
      }
      const gamesInPeriod = cache.filter(
        (g) =>
          g.playtime > 0 &&
          g.lastPlayedAt &&
          (nowMs - g.lastPlayedAt) / 86400000 <= t,
      ).length;
      if (gamesInPeriod >= 3) {
        if (t !== timeframeDays) {
          const months = Math.round(t / 30);
          fallbackMessage = `Not enough data in selected period. Automatically expanded to ${months} Months.`;
          timeframeDays = t;
        }
        break;
      }
    }
  }

  const baseSeed = refreshKey;

  const tasteProfile = buildTasteProfile(cache, timeframeDays, nowMs);

  // 1. FILTERS (Global)
  const validGames = cache.filter((g) => {
    const skipData = skippedGames[g.appId];
    if (skipData) return false;

    const rawName = g.name || "";
    if (
      /\b(soundtrack|ost|sdk|server|playtest|public test|test server|experimental|steamworks|steam linux runtime|proton)\b/i.test(
        rawName,
      ) ||
      /(?: - beta| beta| prototype| multiplayer| dedicated server)$/i.test(
        rawName,
      )
    )
      return false;

    const allTraits = [
      ...(g.tags || []),
      ...(g.genres || []),
      ...(g.categories || []),
    ].map((t) => t.toLowerCase());
    const catSet = new Set((g.categories || []).map((c) => c.toLowerCase()));

    if (prefs.blacklistedTags) {
      const blacklist = prefs.blacklistedTags
        .split(",")
        .map((t: string) => t.trim().toLowerCase())
        .filter(Boolean);
      if (blacklist.some((b: string) => allTraits.includes(b))) return false;
    }

    const softwareTags = [
      "software",
      "utilities",
      "game development",
      "audio production",
      "video production",
      "web publishing",
      "photo editing",
      "education",
    ];
    if (softwareTags.some((t) => allTraits.includes(t))) return false;

    const hasSingleCat = catSet.has("single-player");
    const hasMultiCat =
      catSet.has("multi-player") ||
      catSet.has("co-op") ||
      catSet.has("online co-op") ||
      catSet.has("pvp") ||
      catSet.has("mmo") ||
      catSet.has("shared/split screen") ||
      catSet.has("shared/split screen pvp") ||
      catSet.has("shared/split screen co-op") ||
      catSet.has("cross-platform multiplayer") ||
      catSet.has("lan pvp") ||
      catSet.has("lan co-op") ||
      catSet.has("online pvp") ||
      allTraits.includes("co-op campaign") ||
      allTraits.includes("local co-op") ||
      allTraits.includes("multiplayer");

    if (prefs.modeFilter === "hide_multi" && hasMultiCat && !hasSingleCat)
      return false;
    if (prefs.modeFilter === "hide_single" && hasSingleCat && !hasMultiCat)
      return false;

    if (intent === "Social_Solo" && hasMultiCat && !hasSingleCat) return false;

    if (intent === "Social_Coop") {
      const isCoop =
        catSet.has("co-op") ||
        catSet.has("lan co-op") ||
        catSet.has("online co-op") ||
        catSet.has("shared/split screen co-op") ||
        allTraits.includes("co-op campaign") ||
        allTraits.includes("local co-op");
      if (!isCoop) return false;
    }

    if (intent === "Social_Competitive") {
      const isComp =
        catSet.has("pvp") ||
        catSet.has("online pvp") ||
        catSet.has("lan pvp") ||
        catSet.has("shared/split screen pvp") ||
        ["competitive", "esports", "battle royale"].some((t) =>
          allTraits.includes(t),
        );
      if (!isComp) return false;
    }

    if (prefs.maxAgeYears) {
      const maxAge = parseInt(prefs.maxAgeYears, 10);
      if (!isNaN(maxAge) && maxAge > 0) {
        let releaseYear = 0;
        if (g.releaseDate && g.releaseDate > 0) {
          const msTimestamp =
            g.releaseDate > 9999999999 ? g.releaseDate : g.releaseDate * 1000;
          releaseYear = new Date(msTimestamp).getFullYear();
        } else {
          const id = g.appId;
          if (id < 10000) releaseYear = 2006;
          else if (id < 40000) releaseYear = 2008;
          else if (id < 70000) releaseYear = 2010;
          else if (id < 200000) releaseYear = 2012;
          else if (id < 250000) releaseYear = 2013;
          else if (id < 350000) releaseYear = 2014;
          else if (id < 450000) releaseYear = 2015;
          else if (id < 550000) releaseYear = 2016;
          else if (id < 780000) releaseYear = 2017;
          else if (id < 1000000) releaseYear = 2018;
          else if (id < 1200000) releaseYear = 2019;
          else if (id < 1500000) releaseYear = 2020;
          else if (id < 1800000) releaseYear = 2021;
          else if (id < 2200000) releaseYear = 2022;
          else if (id < 2600000) releaseYear = 2023;
          else if (id < 3000000) releaseYear = 2024;
          else {
            const estimatedYear = 2024 + Math.floor((id - 3000000) / 400000);
            releaseYear = Math.min(estimatedYear, new Date().getFullYear());
          }
        }
        if (new Date().getFullYear() - releaseYear > maxAge) return false;
      }
    }

    if (
      prefs.requireController &&
      !catSet.has("full controller support") &&
      !catSet.has("partial controller support")
    )
      return false;
    if (prefs.requireAchievements && !catSet.has("steam achievements"))
      return false;
    if (prefs.hideFreeToPlay && allTraits.includes("free to play"))
      return false;

    const isVrOnly = catSet.has("vr only");

    if (prefs.vrFilter === "hide_vr" && isVrOnly) return false;
    if (prefs.vrFilter === "only_vr" && !isVrOnly) return false;

    if (prefs.showOnlyInstalled && !g.isInstalled) return false;

    return true;
  });

  // 2. SCORING
  const isColdStart = tasteProfile.size === 0;

  const rawScoredGames: ScoredGame[] = validGames.map((g) => {
    const daysSince = g.lastPlayedAt
      ? (nowMs - g.lastPlayedAt) / 86400000
      : 999;

    const profileMatch = scoreGameAgainstProfile(g, tasteProfile);

    if (isColdStart) {
      const rng = mulberry32(g.appId ^ baseSeed)();

      const metaBonus = g.metacritic ? (g.metacritic / 100) * 0.2 : 0;

      profileMatch.score = rng + metaBonus;
      profileMatch.topMatchedTraits = [];
    }
    const rawTraits = [
      ...(g.tags || []),
      ...(g.genres || []),
      ...(g.categories || []),
    ].map(normalizeTag);
    const normalizedAllTraits = removeRedundantTags(rawTraits);
    const unfilteredTraits = Array.from(new Set(rawTraits));

    const displayTraits = normalizedAllTraits
      .filter((t) => !IGNORE_FOR_MOLD.has(t) && !BROAD_TAGS.has(t))
      .slice(0, 5);

    if (displayTraits.length < 2) {
      const broadTags = normalizedAllTraits.filter(
        (t) => BROAD_TAGS.has(t) && !IGNORE_FOR_MOLD.has(t),
      );
      for (const t of broadTags) {
        if (displayTraits.length >= 5) break;
        if (!displayTraits.includes(t)) displayTraits.push(t);
      }
    }

    const requiredPlaytime = 120 * (1 + Math.pow(daysSince / 365, 0.7));

    return {
      game: g,
      score: profileMatch.score,
      normalizedScore: 0,
      percentile: 0,
      matchPercent: 0,
      reasonId: "TASTE_MATCH",
      reasonPayload: { type: "LABEL", value: "" },
      topMatchedTraits: profileMatch.topMatchedTraits,
      novelTraits: profileMatch.novelTraits,
      normalizedAllTraits,
      unfilteredTraits,
      daysSince,
      displayTraits,
      anchorTag: profileMatch.anchorTag,
      isUnplayed:
        g.playtime === 0 ||
        (intent === "Break_Mold" && g.playtime <= 15) ||
        (intent === "Discover_New" && g.playtime <= 5),
      isForgotten:
        g.playtime > Math.max(requiredPlaytime, 180) && daysSince > 60,
    };
  });

  // SINGLE SORT AND PERCENTILE CALCULATION (Optimised)
  rawScoredGames.sort((a, b) => {
    if (b.score === a.score) return a.game.appId - b.game.appId;
    return b.score - a.score;
  });

  const totalValidGames = Math.max(1, rawScoredGames.length);

  const refIndex = Math.max(0, Math.floor(totalValidGames * 0.05));
  const viewMaxScore = rawScoredGames[refIndex]?.score || 0.0001;

  let currentRank = 0;
  rawScoredGames.forEach((g, i) => {
    if (i > 0 && g.score < rawScoredGames[i - 1].score) currentRank = i;
    // Smoothing
    g.percentile = currentRank / Math.max(1, totalValidGames - 1);
    g.normalizedScore = Math.min(1.5, g.score / viewMaxScore);

    // Log-Scaled Mapping
    const curvedMatch = Math.pow(1 - g.percentile, 1.2);

    if (intent === "Break_Mold") {
      g.matchPercent =
        g.score === 0
          ? 99
          : Math.max(10, Math.min(85, Math.round(curvedMatch * 100)));
    } else {
      g.matchPercent = Math.max(
        10,
        Math.min(99, Math.round(curvedMatch * 100)),
      );
    }
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n=== ENGINE TELEMETRY ===`);
    console.log(`Total Games in Pool: ${rawScoredGames.length}`);
    console.log(
      `Unplayed (Backlog): ${rawScoredGames.filter((g) => g.isUnplayed).length}`,
    );
    console.log(
      `Forgotten (Rediscover): ${rawScoredGames.filter((g) => g.isForgotten).length}`,
    );
    console.log(`========================\n`);
  }

  // 3. STRICT FILTERING FOR INTENT
  let candidates = rawScoredGames;
  if (intent === "Discover_New") {
    candidates = candidates.filter((g) => g.isUnplayed);
  } else if (intent === "Rediscover") {
    candidates = candidates.filter((g) => g.isForgotten);
  } else if (intent === "Break_Mold") {
    const filtered = candidates.filter((c) => {
      if (!c.isUnplayed) return false;

      const isJunk = c.normalizedAllTraits.some(
        (t) =>
          t === "hidden object" ||
          t === "clicker" ||
          t === "match 3" ||
          t === "typing" ||
          t === "software" ||
          t === "utilities" ||
          t === "software training" ||
          t === "audio production",
      );
      if (isJunk) return false;

      const coreGameTags = c.normalizedAllTraits
        .filter((t) => !IGNORE_FOR_MOLD.has(t))
        .slice(0, 5);
      if (coreGameTags.length === 0) return false;

      const novelCount = coreGameTags.filter(
        (t) => (tasteProfile.get(t) || 0) < 0.04,
      ).length;
      if (novelCount < 1) return false;

      return true;
    });

    if (filtered.length < limit) {
      return [];
    }
    candidates = filtered;
  } else if (intent.startsWith("Mood_")) {
    const def = MOOD_DEFINITIONS[intent];
    if (def) {
      const positiveTargets = def.positive.map(normalizeTag);
      const negativeTargets = def.negative.map(normalizeTag);

      const negativeAppPenalties = new Map<number, number>();
      candidates = candidates.filter((g) => {
        const fullTraits = (g as any).unfilteredTraits || g.normalizedAllTraits;
        if (!fullTraits.some((t: string) => positiveTargets.includes(t)))
          return false;

        let cumulativePenalty = 1.0;
        for (let i = 0; i < fullTraits.length; i++) {
          if (negativeTargets.includes(fullTraits[i])) {
            cumulativePenalty *= i < 5 ? 0.15 : 0.4;
          }
        }

        if (cumulativePenalty < 1.0) {
          negativeAppPenalties.set(g.game.appId, cumulativePenalty);
        }
        return true;
      });

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score);
        const moodTotal = Math.max(1, candidates.length);
        const moodRefIdx = Math.max(0, Math.floor(moodTotal * 0.05));
        const moodViewMax = candidates[moodRefIdx]?.score || 0.0001;
        let moodRank = 0;
        candidates.forEach((g, i) => {
          if (i > 0 && g.score < candidates[i - 1].score) moodRank = i;
          g.percentile = moodRank / Math.max(1, moodTotal - 1);
          g.normalizedScore = Math.min(1.5, g.score / moodViewMax);
          const curvedMatch = Math.pow(1 - g.percentile, 1.2);
          g.matchPercent = Math.max(
            10,
            Math.min(99, Math.round(curvedMatch * 100)),
          );
        });
      }

      for (const g of candidates) {
        if (negativeAppPenalties.has(g.game.appId)) {
          const p = negativeAppPenalties.get(g.game.appId)!;
          g.normalizedScore *= p;
          g.matchPercent = Math.max(10, Math.round(g.matchPercent * p));
        }
      }
    }
  }

  // 4. SLOT SYSTEM (Bounded Dynamic)
  type SlotConfig = {
    id: string;
    size: number;
    reason: ReasonId;
    filter: (g: ScoredGame) => boolean;
  };
  const slots: SlotConfig[] = [];

  const maxPerFamily = Math.max(3, Math.ceil(limit * 0.35));

  // 5. SLOT FILLING ALGORITHM AND TELEMETRY LOGS
  const finalSelection: ScoredGame[] = [];
  const fallbackReserve: ScoredGame[] = [];
  const seen = new Set<number>();

  const familyCount = new Map<string, number>();

  const telemetryLogs: string[] = [];

  const libSize = cache.length;
  let coreMax: number, secMin: number, secMax: number, wildMin: number;
  if (libSize < 300) {
    coreMax = 0.35;
    secMin = 0.2;
    secMax = 0.75;
    wildMin = 0.6;
  } else if (libSize < 800) {
    coreMax = 0.28;
    secMin = 0.22;
    secMax = 0.68;
    wildMin = 0.63;
  } else {
    coreMax = 0.25;
    secMin = 0.25;
    secMax = 0.65;
    wildMin = 0.65;
  }

  let breakMoldMin = 0.5;
  if (libSize < 200) breakMoldMin = 0;
  else if (libSize < 500) breakMoldMin = 0.35;

  // RAW POOLS VE QUALITY FILTER
  const isMoodOrSocial =
    intent.startsWith("Mood_") || intent.startsWith("Social_");
  let coreFilter: (g: ScoredGame) => boolean;

  if (isMoodOrSocial && candidates.length > 0) {
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const topN = Math.max(1, Math.floor(sorted.length * 0.6));
    const corePoolSet = new Set(
      sorted
        .slice(0, topN)
        .filter((g) => g.matchPercent >= 20)
        .map((g) => g.game.appId),
    );
    coreFilter = (g) => corePoolSet.has(g.game.appId);
  } else {
    coreFilter = (g) => g.percentile <= coreMax && g.matchPercent >= 25;
  }

  const secFilter = (g: ScoredGame) =>
    g.percentile >= secMin && g.percentile <= secMax;

  const redFilter = (g: ScoredGame) => g.isForgotten && g.percentile <= secMax;

  const wildFilter = (g: ScoredGame) => g.percentile >= wildMin;

  // SPECIAL INTENT RULES
  if (intent === "Break_Mold") {
    slots.push({
      id: "wildcard",
      size: limit,
      reason: "NEW_EXPERIENCE",
      filter: (g) => g.isUnplayed && g.percentile >= breakMoldMin,
    });
  } else if (intent === "Rediscover") {
    const cPool = candidates.filter((g) => g.percentile <= coreMax);
    const sPool = candidates.filter((g) => g.percentile >= secMin);
    const cLog = Math.log(cPool.length + 1);
    const sLog = Math.log(sPool.length + 1);
    const totalLog = cLog + sLog || 1;

    const cSize = Math.round((cLog / totalLog) * limit);
    const sSize = limit - cSize;

    slots.push({
      id: "core",
      size: cSize,
      reason: "FORGOTTEN_FAVORITE",
      filter: (g) => g.percentile <= coreMax,
    });
    slots.push({
      id: "secondary",
      size: sSize,
      reason: "FORGOTTEN_FAVORITE",
      filter: (g) => g.percentile >= secMin,
    });
  } else {
    // SCARCITY VE ENTROPY CONTROL
    const isDiscoverNew = intent === "Discover_New";

    const corePool: ScoredGame[] = [];
    const secPool: ScoredGame[] = [];
    const redPool: ScoredGame[] = [];
    const wildPool: ScoredGame[] = [];

    for (const g of candidates) {
      if (coreFilter(g)) corePool.push(g);
      if (secFilter(g)) secPool.push(g);
      if (!isDiscoverNew && redFilter(g)) redPool.push(g);
      if (wildFilter(g)) wildPool.push(g);
    }

    const totalPoolSize = Math.max(1, candidates.length);

    // ENTROPY CONTROL
    const getEntropyMultiplier = (pool: ScoredGame[]) => {
      if (pool.length < 10) return 1.0;
      const counts = new Map<string, number>();
      let maxCount = 0;
      for (const g of pool) {
        const primaryTrait =
          g.normalizedAllTraits.find((t) => !IGNORE_FOR_MOLD.has(t)) ||
          "unknown";
        const c = (counts.get(primaryTrait) || 0) + 1;
        counts.set(primaryTrait, c);
        if (c > maxCount) maxCount = c;
      }
      const dominance = maxCount / pool.length;
      if (dominance > 0.4) {
        return Math.max(0.4, 1 - (dominance - 0.4));
      }
      return 1.0;
    };

    const coreWeight =
      Math.sqrt(corePool.length) * getEntropyMultiplier(corePool);
    const secWeight = Math.sqrt(secPool.length) * getEntropyMultiplier(secPool);
    const wildWeight = Math.sqrt(wildPool.length);

    const redScarcity = Math.min(1, redPool.length / (totalPoolSize * 0.15));
    const redWeight =
      redPool.length < 5
        ? 0
        : Math.sqrt(redPool.length) *
          redScarcity *
          getEntropyMultiplier(redPool);

    // Largest Remainder Method
    const totalWeight = coreWeight + secWeight + redWeight + wildWeight || 1;

    const rawCore = (coreWeight / totalWeight) * limit;
    const rawSec = (secWeight / totalWeight) * limit;
    const rawRed = (redWeight / totalWeight) * limit;
    const rawWild = (wildWeight / totalWeight) * limit;

    // GUARDRAILS
    const redMax = Math.min(
      Math.floor(limit * 0.2),
      Math.ceil(redPool.length / 10),
    );
    const wildMax = Math.max(1, Math.floor(limit * 0.15));
    const coreMax = Math.floor(limit * 0.6);

    const slotsConfig = [
      {
        id: "core",
        size: Math.floor(rawCore),
        rem: rawCore % 1,
        filter: coreFilter,
      },
      {
        id: "secondary",
        size: Math.floor(rawSec),
        rem: rawSec % 1,
        filter: secFilter,
      },
      {
        id: "rediscover",
        size: Math.floor(rawRed),
        rem: rawRed % 1,
        filter: redFilter,
      },
      {
        id: "wildcard",
        size: Math.floor(rawWild),
        rem: rawWild % 1,
        filter: wildFilter,
      },
    ];

    const redSlot = slotsConfig.find((s) => s.id === "rediscover")!;
    const wildSlot = slotsConfig.find((s) => s.id === "wildcard")!;
    const coreSlot = slotsConfig.find((s) => s.id === "core")!;

    redSlot.size = Math.min(redSlot.size, redMax);
    wildSlot.size = Math.min(wildSlot.size, wildMax);
    coreSlot.size = Math.min(coreSlot.size, coreMax);

    // Fill Guarantee
    let currentTotal = slotsConfig.reduce((acc, curr) => acc + curr.size, 0);
    slotsConfig.sort((a, b) => b.rem - a.rem);

    let idx = 0;
    while (currentTotal < limit && idx < 10) {
      let allocatedInPass = false;
      for (const slot of slotsConfig) {
        if (currentTotal >= limit) break;

        if (slot.id === "rediscover" && slot.size >= redMax) continue;
        if (slot.id === "wildcard" && slot.size >= wildMax) continue;
        if (slot.id === "core" && slot.size >= coreMax) continue;

        slot.size++;
        currentTotal++;
        allocatedInPass = true;
      }
      if (!allocatedInPass) break;
      idx++;
    }

    const coreRef = slotsConfig.find((s) => s.id === "core")!;
    if (coreRef.size < 1) coreRef.size = 1;

    for (const slot of slotsConfig) {
      if (slot.id === "rediscover" && isDiscoverNew) continue;
      if (slot.size > 0) {
        slots.push({
          id: slot.id,
          size: slot.size,
          reason:
            slot.id === "rediscover"
              ? "FORGOTTEN_FAVORITE"
              : slot.id === "wildcard"
                ? "WILDCARD"
                : "TASTE_MATCH",
          filter: slot.filter,
        });
      }
    }
  }

  const PRIORITY: Record<string, number> = {
    core: 1,
    secondary: 2,
    rediscover: 3,
    wildcard: 4,
  };
  slots.sort((a, b) => PRIORITY[a.id] - PRIORITY[b.id]);

  // Family Mapper
  const getFamily = (input: string | string[]) => {
    const traits = Array.isArray(input) ? input : [input];

    const familyMap: Record<string, string[]> = {
      rpg: ["rpg", "crpg", "jrpg", "arpg"],
      strategy: [
        "strategy",
        "rts",
        "4x",
        "tower defense",
        "tactical",
        "moba",
        "wargame",
      ],
      simulation: [
        "sim",
        "simulation",
        "builder",
        "management",
        "automation",
        "agriculture",
        "farming",
        "colony",
        "sandbox",
      ],
      action: [
        "action",
        "shooter",
        "fps",
        "hack and slash",
        "spectacle fighter",
        "beat 'em up",
        "fighting",
        "brawler",
        "musou",
      ],
      sports: [
        "racing",
        "sports",
        "football",
        "basketball",
        "skate",
        "golf",
        "tennis",
        "hockey",
        "cycling",
      ],
      survival: ["survival", "crafting", "base building"],
      rogue: ["roguelike", "roguelite", "rogue", "permadeath"],
      tabletop: [
        "card",
        "deck",
        "deckbuilder",
        "board game",
        "tabletop",
        "auto battler",
        "chess",
      ],
      puzzle: [
        "puzzle",
        "logic",
        "sokoban",
        "match 3",
        "hidden object",
        "trivia",
        "programming",
      ],
      narrative: [
        "visual novel",
        "walking simulator",
        "interactive fiction",
        "fmv",
        "story rich",
        "cyoa",
        "dating sim",
      ],
      platformer: ["platformer", "metroidvania", "precision platformer"],
      horror: ["horror", "psychological horror", "survival horror"],
      casual: ["casual", "cozy", "relaxing", "family friendly", "party"],
      arcade: ["arcade", "score attack", "time attack", "boss rush"],
    };

    const coreOrder = [
      "rpg",
      "strategy",
      "simulation",
      "action",
      "platformer",
      "survival",
      "rogue",
      "horror",
      "tabletop",
      "puzzle",
      "sports",
      "narrative",
      "arcade",
      "casual",
    ];

    for (const targetFamily of coreOrder) {
      if (
        traits.some((t) =>
          familyMap[targetFamily]?.some((keyword) => t.includes(keyword)),
        )
      ) {
        return targetFamily;
      }
    }
    return traits.length > 0 ? traits[0] : "other";
  };

  let slotIndex = 0;
  let rolloverQuota = 0;

  for (const slot of slots) {
    if (finalSelection.length >= limit) break;

    let pool = candidates
      .filter(slot.filter)
      .filter((g) => !seen.has(g.game.appId));
    const purePoolSize = pool.length;

    const currentTarget = slot.size + rolloverQuota;
    rolloverQuota = 0;

    const minRequired = currentTarget * 2;
    if (pool.length < minRequired) {
      pool = candidates
        .filter((g) => {
          if (seen.has(g.game.appId)) return false;
          if (slot.reason === "FORGOTTEN_FAVORITE" && !g.isForgotten)
            return false;
          if (slot.reason === "NEW_EXPERIENCE" && !g.isUnplayed) return false;
          return true;
        })
        .sort((a, b) => {
          if (intent === "Break_Mold")
            return a.normalizedScore - b.normalizedScore;
          return b.normalizedScore - a.normalizedScore;
        })
        .slice(0, Math.max(minRequired, 20));
    }

    pool = seededShuffle(pool, baseSeed + slotIndex * 997);

    let pickedForSlot = 0;
    let skippedForQuota = 0;

    // Seed for Weighted Random
    const rng = mulberry32(baseSeed + slotIndex);
    let availableCandidates = [...pool];

    const moodDef = intent.startsWith("Mood_")
      ? MOOD_DEFINITIONS[intent]
      : null;
    const moodPositives = new Set(
      moodDef ? moodDef.positive.map(normalizeTag) : [],
    );

    while (
      pickedForSlot < currentTarget &&
      availableCandidates.length > 0 &&
      finalSelection.length < limit
    ) {
      const scoredCandidates = availableCandidates.map((c) => {
        let maxOverlap = 0;

        // 1. Szymkiewicz–Simpson (Overlap Coefficient) Calculation
        for (const selected of finalSelection) {
          let intersectionScore = 0;
          let candWeight = 0;
          let selWeight = 0;

          const candTags = c.normalizedAllTraits.filter(
            (t) => !moodPositives.has(t),
          );
          const selNormTags = selected.normalizedAllTraits.filter(
            (t) => !moodPositives.has(t),
          );

          for (const t of candTags) candWeight += BROAD_TAGS.has(t) ? 0.2 : 1.0;
          for (const t of selNormTags)
            selWeight += BROAD_TAGS.has(t) ? 0.2 : 1.0;

          for (const t of candTags) {
            if (selNormTags.includes(t))
              intersectionScore += BROAD_TAGS.has(t) ? 0.2 : 1.0;
          }

          const minWeight = Math.min(candWeight, selWeight);
          const overlap = minWeight > 0 ? intersectionScore / minWeight : 0;
          if (overlap > maxOverlap) maxOverlap = overlap;
        }

        // 2. Dominance Cap Control
        const primaryTraits = c.normalizedAllTraits.filter(
          (t) => !IGNORE_FOR_MOLD.has(t),
        );

        const family = getFamily(primaryTraits.slice(0, 3));

        const currentFamilyPicks = familyCount.get(family) || 0;
        const isCapped = currentFamilyPicks >= maxPerFamily;

        // 3. Score Update
        const isSmallPool = purePoolSize < 50;

        const dropOffRate = isSmallPool ? 0.15 : 0.25;
        const familyPenaltyMultiplier = Math.max(
          0.4,
          1.0 - currentFamilyPicks * dropOffRate,
        );

        const overlapLambda = isSmallPool
          ? 0.05 + rng() * 0.1
          : 0.25 + rng() * 0.25;

        let effectiveScore = c.normalizedScore;
        if (slot.id === "wildcard") {
          effectiveScore = 0.5 + rng() * 0.5;
        } else {
          const isMoodOrSocial =
            intent.startsWith("Mood_") || intent.startsWith("Social_");

          if (isMoodOrSocial) {
            effectiveScore =
              Math.pow(c.normalizedScore, 0.7) + 0.15 + rng() * 0.35;
          } else {
            const variance = isSmallPool ? 0.15 : 0.35;
            effectiveScore =
              Math.pow(c.normalizedScore, 0.9) + 0.05 + rng() * variance;
          }
        }

        const baseAdjusted = effectiveScore * familyPenaltyMultiplier;
        const overlapPenalty = maxOverlap * overlapLambda;

        const adjustedScore = isCapped ? -1 : baseAdjusted - overlapPenalty;

        return { game: c, adjustedScore, family };
      });

      const validCandidates = scoredCandidates.filter(
        (sc) => sc.adjustedScore > 0,
      );

      if (validCandidates.length === 0) {
        const bestRemaining = scoredCandidates.sort(
          (a, b) => b.adjustedScore - a.adjustedScore,
        )[0];
        if (bestRemaining) {
          seen.add(bestRemaining.game.game.appId);
          fallbackReserve.push({
            ...bestRemaining.game,
            reasonId:
              slot.reason === "TASTE_MATCH" &&
              bestRemaining.game.normalizedScore === 0
                ? "WILDCARD"
                : slot.reason,
            reasonPayload:
              slot.reason === "FORGOTTEN_FAVORITE"
                ? {
                    type: "DAYS",
                    value: Math.floor(bestRemaining.game.daysSince),
                  }
                : {
                    type: "TAG",
                    value: getContextualTraits(
                      bestRemaining.game,
                      intent,
                      tasteProfile,
                    ),
                  },
          });
          skippedForQuota++;
          availableCandidates = availableCandidates.filter(
            (c) => c.game.appId !== bestRemaining.game.game.appId,
          );
        } else {
          break;
        }
        continue;
      }

      // 4. Weighted Random Sampling
      let totalWeight = 0;
      for (const sc of validCandidates) totalWeight += sc.adjustedScore;

      let randomVal = rng() * totalWeight;
      let selectedSC = validCandidates[validCandidates.length - 1];

      for (const sc of validCandidates) {
        randomVal -= sc.adjustedScore;
        if (randomVal <= 0) {
          selectedSC = sc;
          break;
        }
      }

      const selectedCandidate = selectedSC.game;
      availableCandidates = availableCandidates.filter(
        (c) => c.game.appId !== selectedCandidate.game.appId,
      );
      seen.add(selectedCandidate.game.appId);

      familyCount.set(
        selectedSC.family,
        (familyCount.get(selectedSC.family) || 0) + 1,
      );

      const payload: ReasonPayload =
        slot.reason === "FORGOTTEN_FAVORITE"
          ? { type: "DAYS", value: Math.floor(selectedCandidate.daysSince) }
          : {
              type: "TAG",
              value: getContextualTraits(
                selectedCandidate,
                intent,
                tasteProfile,
              ),
            };

      const gameToAdd: ScoredGame = {
        ...selectedCandidate,
        reasonId:
          selectedCandidate.normalizedScore === 0 &&
          slot.reason === "TASTE_MATCH"
            ? "WILDCARD"
            : slot.reason,
        reasonPayload: payload,
      };

      finalSelection.push(gameToAdd);
      pickedForSlot++;
    }

    // Early Relaxation
    if (pickedForSlot < currentTarget && skippedForQuota > 0) {
      const needed = currentTarget - pickedForSlot;

      const candidatesToRescue = fallbackReserve.slice(-skippedForQuota);

      let rescued = 0;
      for (const gameToRescue of candidatesToRescue) {
        if (rescued >= needed) break;

        finalSelection.push(gameToRescue);

        const idx = fallbackReserve.findIndex(
          (g) => g.game.appId === gameToRescue.game.appId,
        );
        if (idx > -1) fallbackReserve.splice(idx, 1);

        pickedForSlot++;
        rescued++;
      }
    }

    if (pickedForSlot < currentTarget) {
      const physicalShortfall =
        currentTarget - (pickedForSlot + skippedForQuota);
      if (physicalShortfall > 0) {
        rolloverQuota = physicalShortfall;
      }
    }

    telemetryLogs.push(
      `[${slot.id.toUpperCase()}] -> Target: ${currentTarget} (Base: ${slot.size}) | Pool: ${purePoolSize} | Selected: ${pickedForSlot}`,
    );
    slotIndex++;
  }

  if (process.env.NODE_ENV !== "production") {
    const g = globalThis as any;
    const now = Date.now();
    if (!g._lastPoolLog || now - g._lastPoolLog > 50) {
      g._lastPoolLog = now;

      console.log(`\n=== 🔄 REFRESH: [${intent}] POOL DEPTH REPORT ===`);
      telemetryLogs.forEach((log) => console.log(log));
      console.log(`Total Pool (Candidates): ${candidates.length}`);

      // --- POOL DIVERSITY (All Candidates) ---
      console.log(`\n--- Candidate Pool Diversity (Top 10) ---`);
      const poolFamilyCount = new Map<string, number>();
      candidates.forEach((c) => {
        const primaryTraits: string[] = [];
        for (const t of c.normalizedAllTraits) {
          if (!IGNORE_FOR_MOLD.has(t) && !primaryTraits.includes(t)) {
            primaryTraits.push(t);
            if (primaryTraits.length >= 2) break;
          }
        }
        const dominantTrait =
          primaryTraits.length > 0 ? primaryTraits[0] : "other";
        const fam = getFamily(dominantTrait);
        poolFamilyCount.set(fam, (poolFamilyCount.get(fam) || 0) + 1);
      });

      const sortedPoolFamilies = Array.from(poolFamilyCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      sortedPoolFamilies.forEach(([fam, count]) => {
        const pct = ((count / candidates.length) * 100).toFixed(1);
        console.log(`${toTitleCase(fam)}: %${pct} (${count} games)`);
      });

      // --- SELECTED GAMES DIVERSITY ---
      console.log(`\n--- Selected Games Diversity (Final List) ---`);
      const totalSelected = finalSelection.length;
      if (totalSelected > 0) {
        const sortedFamilies = Array.from(familyCount.entries()).sort(
          (a, b) => b[1] - a[1],
        );
        sortedFamilies.forEach(([fam, count]) => {
          const pct = ((count / totalSelected) * 100).toFixed(1);
          console.log(`${toTitleCase(fam)}: %${pct} (${count} games)`);
        });
      } else {
        console.log(`No games selected yet.`);
      }
      console.log(`=====================================================\n`);
    }
    // --- SELECTED GAMES TRAIT DIVERSITY (RAW TAGS) ---
    console.log(`\n--- Selected Games Trait Diversity (Raw, Top 15) ---`);
    const totalSelected = finalSelection.length;
    const traitCount = new Map<string, number>();
    for (const game of finalSelection) {
      const uniqueTraits = new Set(
        game.normalizedAllTraits.filter((t) => !IGNORE_FOR_MOLD.has(t)),
      );
      for (const trait of uniqueTraits) {
        traitCount.set(trait, (traitCount.get(trait) || 0) + 1);
      }
    }
    const sortedTraits = Array.from(traitCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    sortedTraits.forEach(([trait, count]) => {
      const pct = ((count / totalSelected) * 100).toFixed(1);
      console.log(`${toTitleCase(trait)}: %${pct} (${count}/${totalSelected})`);
    });
  }

  // 6. SOFT RELAXATION
  let currentFamilyCap = maxPerFamily + 1;
  let relaxationPasses = 0;

  while (
    finalSelection.length < limit &&
    fallbackReserve.length > 0 &&
    relaxationPasses < 15
  ) {
    let i = 0;
    while (i < fallbackReserve.length && finalSelection.length < limit) {
      const c = fallbackReserve[i];

      const primaryTraits: string[] = [];
      for (const t of c.normalizedAllTraits) {
        if (!IGNORE_FOR_MOLD.has(t) && !primaryTraits.includes(t)) {
          primaryTraits.push(t);
          if (primaryTraits.length >= 2) break;
        }
      }
      const dominantTrait =
        primaryTraits.length > 0 ? primaryTraits[0] : "unknown";
      const dominantFamily = getFamily(dominantTrait);

      if ((familyCount.get(dominantFamily) || 0) < currentFamilyCap) {
        familyCount.set(
          dominantFamily,
          (familyCount.get(dominantFamily) || 0) + 1,
        );
        finalSelection.push(c);
        fallbackReserve.splice(i, 1);
      } else {
        i++;
      }
    }
    currentFamilyCap++;
    relaxationPasses++;
  }

  // 6.5 FALLBACK DUMP
  while (finalSelection.length < limit && fallbackReserve.length > 0) {
    finalSelection.push(fallbackReserve.shift()!);
  }

  // 7. GLOBAL FALLBACK
  if (finalSelection.length < limit) {
    const remaining = candidates
      .filter((g) => !seen.has(g.game.appId))
      .sort((a, b) => b.normalizedScore - a.normalizedScore);
    for (const c of remaining) {
      if (finalSelection.length >= limit) break;
      seen.add(c.game.appId);

      finalSelection.push({
        ...c,
        reasonId: c.normalizedScore < 0.2 ? "WILDCARD" : "TASTE_MATCH",
        reasonPayload: {
          type: "TAG",
          value: getContextualTraits(c, intent, tasteProfile),
        },
      });
    }
  }

  // 8. SORTING AND GROUPING
  const greens: ScoredGame[] = [];
  const yellows: ScoredGame[] = [];
  const grays: ScoredGame[] = [];
  const forgotten: ScoredGame[] = [];
  const playedWildcards: ScoredGame[] = [];
  const unplayedWildcards: ScoredGame[] = [];

  for (const item of finalSelection) {
    if (item.reasonId === "FORGOTTEN_FAVORITE") {
      forgotten.push(item);
    } else if (item.reasonId === "WILDCARD") {
      if (item.game.playtime > 0) playedWildcards.push(item);
      else unplayedWildcards.push(item);
    } else {
      if (item.matchPercent >= 60) greens.push(item);
      else if (item.matchPercent >= 25) yellows.push(item);
      else grays.push(item);
    }
  }

  const finalResult = [
    ...greens,
    ...yellows,
    ...grays,
    ...forgotten,
    ...playedWildcards,
    ...unplayedWildcards,
  ];

  if (isColdStart && finalResult.length > 0) {
    finalResult[0].fallbackMessage =
      "No play history found. Showing a randomized selection of top-rated games.";
  } else if (fallbackMessage && finalResult.length > 0) {
    finalResult[0].fallbackMessage = fallbackMessage;
  }

  return finalResult;
}
