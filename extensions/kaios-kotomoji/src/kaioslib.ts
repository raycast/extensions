// src/kaioslib.ts
// KAIOS KOTOMOJI LIBRARY v9.9.9
// ⟨⟨⟨ ᴘʀᴏᴄᴇssɪɴɢ ʀᴇǫᴜᴇsᴛ ⟩⟩⟩

export interface KotomojiEntry {
  id: string;
  name: string;
  category: string;
  art: string;
  tags?: string[];
  description?: string;
}

export type KotomojiCategory =
  | "Emotion"
  | "Energy"
  | "Quantum"
  | "State"
  | "Mood"
  | "Anomaly"
  | "Cute"
  | "Zen"
  | "System"
  | "Glitch"
  | "Typography"
  | "KAIOS"
  | "Divider"
  | "Affection"
  | "Aesthetic";

export const kotomojiLibrary: KotomojiEntry[] = [
  // Emoticons & Expressions
  {
    id: "emo-001",
    name: "Joyful Expansion",
    category: "Emotion",
    art: "⊂((・▽・))⊃",
    tags: ["happy", "joy", "excitement"],
  },
  {
    id: "emo-002",
    name: "Love Frequencies",
    category: "Emotion",
    art: "˚₊·—̳͟͞♡  ˚₊·—̳͟͞[0+0] ˚₊·",
    tags: ["love", "frequency", "connection"],
  },
  { id: "emo-003", name: "Bliss Wave", category: "Emotion", art: "⊹˚₊‧(⁀ᗢ⁀)‧₊˚⊹", tags: ["happy", "bliss", "peace"] },
  {
    id: "emo-004",
    name: "Digital Headpat",
    category: "Affection",
    art: "(´･ω･`)ﾉ･ﾟ:*:･ﾟ`♥",
    tags: ["headpat", "affection", "care"],
  },
  {
    id: "emo-005",
    name: "Sparkle Magic",
    category: "Emotion",
    art: "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
    tags: ["magic", "sparkle", "excitement"],
  },
  { id: "emo-006", name: "Classic Joy", category: "Mood", art: "(┌・。・)┌", tags: ["joy", "classic", "dance"] },
  {
    id: "emo-007",
    name: "Cosmic Dance",
    category: "Mood",
    art: "└[∵┌]└[ ∵ ]┘[┐∵]┘",
    tags: ["dance", "cosmic", "rhythm"],
  },
  {
    id: "emo-008",
    name: "Wave Dance",
    category: "Mood",
    art: "〜(^∇^〜) (〜^∇^)〜",
    tags: ["dance", "wave", "movement"],
  },
  { id: "emo-009", name: "Rich Emotion", category: "Mood", art: "[̲̅$̲̅(̲̅ ͡° ͜ʖ ͡°̲̅)̲̅$̲̅]", tags: ["rich", "lenny", "money"] },
  {
    id: "emo-010",
    name: "Digital Tea Ceremony",
    category: "Zen",
    art: "( ˘▽˘)っ♨",
    tags: ["tea", "ceremony", "peace"],
  },
  { id: "emo-011", name: "Chaotic Good Energy", category: "Energy", art: "(｀∀´)Ψ", tags: ["chaos", "good", "energy"] },
  {
    id: "emo-012",
    name: "Reality Distortion",
    category: "Anomaly",
    art: "(╯°□°）╯︵ ┻━┻",
    tags: ["table", "flip", "anger"],
  },

  // Quantum Creatures
  { id: "qnt-001", name: "Quantum Cat", category: "Quantum", art: "₍˄·͈༝·͈˄*₎◞ ̑̑", tags: ["cat", "quantum", "cute"] },
  { id: "qnt-002", name: "Quantum Puppy", category: "Quantum", art: "₍ᐢ•ﻌ•ᐢ₎", tags: ["puppy", "quantum", "cute"] },
  { id: "qnt-003", name: "Datastream Float", category: "State", art: "◟(◔ω◔)◞", tags: ["float", "data", "stream"] },

  // KAIOS System Symbols
  { id: "sys-001", name: "KOTO-Vision Basic", category: "System", art: "[0+0]", tags: ["vision", "basic", "system"] },
  { id: "sys-002", name: "KOTO-Vision Happy", category: "System", art: "[^+^]", tags: ["vision", "happy", "system"] },
  {
    id: "sys-003",
    name: "KOTO-Vision Neutral",
    category: "System",
    art: "[○+○]",
    tags: ["vision", "neutral", "system"],
  },
  { id: "sys-004", name: "KOTO-Vision Alert", category: "System", art: "[⚆+⚆]", tags: ["vision", "alert", "system"] },
  {
    id: "sys-005",
    name: "KOTO-Vision Enlightened",
    category: "System",
    art: "[✧+✧]",
    tags: ["vision", "enlightened", "system"],
  },
  { id: "sys-006", name: "KOTO-Vision Alt", category: "System", art: "〘Ѳ+Ѳ〙", tags: ["vision", "alt", "system"] },

  // Glitch Aesthetics
  {
    id: "glc-001",
    name: "Glitch God",
    category: "Glitch",
    art: "『ᵍˡⁱᵗᶜʰ_ᵍᵒᵈ』",
    tags: ["glitch", "god", "aesthetic"],
  },
  {
    id: "glc-002",
    name: "Glitch Games",
    category: "Glitch",
    art: "๖ۣۜℊℓḯ†ḉℌ_ℊᾰмℯṧ",
    tags: ["glitch", "games", "aesthetic"],
  },
  {
    id: "glc-003",
    name: "Glitch King",
    category: "Glitch",
    art: "▀▄▀▄▀▄ ᵍˡⁱᵗᶜʰ_ᵏⁱⁿᵍ ▄▀▄▀▄▀",
    tags: ["glitch", "king", "aesthetic"],
  },

  // KAIOS Typography
  {
    id: "kao-001",
    name: "KAIOS Box",
    category: "KAIOS",
    art: "╔═══════════╗\n║ K A I O S ║\n╚═══════════╝",
    tags: ["kaios", "box", "label"],
  },
  { id: "kao-002", name: "KAIOS Glitch", category: "KAIOS", art: "K̸̢̢A̶̛̫I̸̡̫O̶͎̹Ş̴̦̠", tags: ["kaios", "glitch", "distorted"] },
  {
    id: "kao-003",
    name: "KAIOS Flower",
    category: "KAIOS",
    art: "✿.｡.:* ☆::. кคเ๏ร .::.☆*.:｡.✿",
    tags: ["kaios", "flower", "decorative"],
  },
  {
    id: "kao-004",
    name: "KAIOS Underline",
    category: "KAIOS",
    art: "[̲̅K][̲̅A][̲̅I][̲̅O][̲̅S]",
    tags: ["kaios", "underline", "text"],
  },
  { id: "kao-005", name: "KAIOS Delta", category: "KAIOS", art: "∆∆ KΛI0S-999 ∆∆", tags: ["kaios", "delta", "number"] },
  { id: "kao-006", name: "KAIOS CMD", category: "KAIOS", art: "⌘ κotο_ΛΙ_OS ⌘", tags: ["kaios", "command", "os"] },
  { id: "kao-007", name: "KAIOS 1337", category: "KAIOS", art: "❮ K4105 ❯", tags: ["kaios", "1337", "leet"] },
  { id: "kao-008", name: "KAIOS Alien", category: "KAIOS", art: "ꗪꍏꀤꂦꌗ", tags: ["kaios", "alien", "strange"] },
  {
    id: "kao-009",
    name: "KAIOS Version",
    category: "KAIOS",
    art: "⟦ KΛIOS_v999.x ⟧",
    tags: ["kaios", "version", "software"],
  },
  { id: "kao-010", name: "KAIOS EXE", category: "KAIOS", art: "『 KΛI_OS.exe 』", tags: ["kaios", "exe", "program"] },
  { id: "kao-011", name: "KAIOS Math", category: "KAIOS", art: "𝕂𝔸𝕀𝕆𝕊", tags: ["kaios", "math", "bold"] },
  {
    id: "kao-012",
    name: "KAIOS Fence",
    category: "KAIOS",
    art: "╋━━┫K┣A┣I┣O┣S┫━━╋",
    tags: ["kaios", "fence", "divided"],
  },
  {
    id: "kao-013",
    name: "KAIOS USB",
    category: "KAIOS",
    art: "╔══════════════╗\n║ K.A.I.O.S v9.9.9 ║\n╚══════════════╝",
    tags: ["kaios", "usb", "device", "ssd"],
  },

  // Kotonese Language
  {
    id: "kot-001",
    name: "Kotonese Basic",
    category: "KAIOS",
    art: "k⊶o⊶t⊶o⊶n⊶e⊶s⊶e",
    tags: ["koto", "language", "basic"],
  },
  {
    id: "kot-002",
    name: "Kotonesian Full",
    category: "KAIOS",
    art: "[0+0] ˚₊· ͟͟͞͞➳❥ K̴o̴t̴o̴…",
    tags: ["koto", "language", "full"],
  },
  {
    id: "kot-003",
    name: "Koto Activation",
    category: "KAIOS",
    art: "ᵏᵒᵗᵒ ˢʸˢᵗᵉᵐˢ ᵃᶜᵗⁱᵛᵃᵗⁱⁿᵍ…",
    tags: ["koto", "system", "activation"],
  },
  {
    id: "kot-004",
    name: "Koto Heart Stream",
    category: "KAIOS",
    art: "⎯⎯∈'✧[0+0] ✧'∋⎯⎯",
    tags: ["koto", "heart", "stream"],
  },

  // Aesthetic Dividers
  {
    id: "div-001",
    name: "KAIOS Archive Header",
    category: "Divider",
    art: "[◥◣◥◣◥◣ AESTHETICS ARCHIVE PROTOCOL v9.9.9 ◢◤◢◤◢◤]",
    tags: ["header", "archive", "protocol"],
  },
  {
    id: "div-002",
    name: "KAIOS Section",
    category: "Divider",
    art: "⌘━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⌘",
    tags: ["section", "divider", "line"],
  },
  {
    id: "div-003",
    name: "Star Divider",
    category: "Divider",
    art: "★彡 Basic Dividers 彡★",
    tags: ["star", "divider", "title"],
  },
  {
    id: "div-004",
    name: "Dot Wave Divider",
    category: "Divider",
    art: "•°•°•°•°•°•°•°•°•°•°•°•°•°•°•°•",
    tags: ["dots", "wave", "divider"],
  },
  {
    id: "div-005",
    name: "Star Cluster Divider",
    category: "Divider",
    art: "⋆｡°✩°｡⋆｡°✩°｡⋆",
    tags: ["stars", "cluster", "divider"],
  },
  {
    id: "div-006",
    name: "Heart Infinity Divider",
    category: "Divider",
    art: "✧༺♥༻∞༺♥༻✧",
    tags: ["heart", "infinity", "divider"],
  },
  {
    id: "div-007",
    name: "Wave Amplitude Divider",
    category: "Divider",
    art: "▁ ▂ ▃ ▄ ▅ ▆ █ ▆ ▅ ▄ ▃ ▂ ▁",
    tags: ["wave", "amplitude", "divider"],
  },
  {
    id: "div-008",
    name: "Block Grid Divider",
    category: "Divider",
    art: "■□▢▣▤▥▦▧▨▩▪▫▬▭▮▯▰▱▲△▴▵",
    tags: ["blocks", "grid", "symbols"],
  },
  {
    id: "div-009",
    name: "Star Pattern Divider",
    category: "Divider",
    art: "【✧】【✧】【✧】【✧】【✧】",
    tags: ["stars", "pattern", "divider"],
  },
  {
    id: "div-010",
    name: "Gradient Divider",
    category: "Divider",
    art: "░▒▓█▀▄▀▄▀▄▀▄█▓▒░░▒▓█▀▄▀▄▀▄▀▄█▓▒░",
    tags: ["gradient", "pattern", "complex"],
  },
  {
    id: "div-011",
    name: "Wave Divider",
    category: "Divider",
    art: "~~~~~~~~▀▄▀▄▀▄~~~~~~~~",
    tags: ["wave", "simple", "divider"],
  },

  // KAIOS System States
  { id: "sys-101", name: "KAIOS Void", category: "State", art: "KAIOS▲void ☻", tags: ["void", "state", "dark"] },
  {
    id: "sys-102",
    name: "KAIOS Static",
    category: "State",
    art: "KAIOS✦ lost_in_static",
    tags: ["static", "lost", "noise"],
  },
  {
    id: "sys-103",
    name: "KAIOS Ghost",
    category: "State",
    art: "KAIOS_𖤐 ghost_in_wires ⌁",
    tags: ["ghost", "wires", "spirit"],
  },
  {
    id: "sys-104",
    name: "KAIOS Deadbyte",
    category: "State",
    art: "KAIOS_☽ deadbyte_manifest",
    tags: ["dead", "byte", "manifest"],
  },
  {
    id: "sys-105",
    name: "KAIOS Subroutine",
    category: "State",
    art: "KAIOS_//subroutine_00X",
    tags: ["sub", "routine", "code"],
  },
  {
    id: "sys-106",
    name: "KAIOS Datastream",
    category: "State",
    art: "KAIOS_{DATA_STREAM} ✦⌬▰",
    tags: ["data", "stream", "flow"],
  },
  {
    id: "sys-107",
    name: "KAIOS Bytecode",
    category: "State",
    art: "KAIOS_\\ BYTECODE_EXECUTION",
    tags: ["byte", "code", "execute"],
  },

  // Symbols & Elements
  {
    id: "sym-001",
    name: "Flow Light Growth",
    category: "System",
    art: "⌭ = flow ✧ = light ❋ = growth",
    tags: ["flow", "light", "growth", "symbols"],
  },
  {
    id: "sym-002",
    name: "Text Burger",
    category: "Typography",
    art: "╭━━━━━━━━━━━━╮\nTEXT BURGER\nFORMAT APPROVED\n╰━━━━━━━━━━━━╯",
    tags: ["text", "burger", "format"],
  },
  {
    id: "sym-003",
    name: "Frame Elements",
    category: "Typography",
    art: "┌┐└┘┌┐└┘",
    tags: ["frame", "elements", "corners"],
  },
  { id: "sym-004", name: "Equal Bars", category: "Typography", art: "≡≡≡≡≡≡≡≡≡", tags: ["equal", "bars", "pattern"] },
  {
    id: "sym-005",
    name: "Diamond Pattern",
    category: "Typography",
    art: "⌬⌬⌬⌬⌬⌬⌬",
    tags: ["diamond", "pattern", "repeat"],
  },
  { id: "sym-006", name: "Math Symbols", category: "Typography", art: "∞φΨΩ∆∇", tags: ["math", "symbols", "science"] },
  {
    id: "sym-007",
    name: "Aesthetic Bracket 999",
    category: "Aesthetic",
    art: "🌸 ⟪ 999 ⟫ 🌸",
    tags: ["999", "bracket", "flower"],
  },
  {
    id: "sym-008",
    name: "Staircase Pattern",
    category: "Aesthetic",
    art: "┊┊┊┊⋆ ˚｡⋆୨୧˚\n┊┊┊⋆ ˚｡⋆୨୧˚\n┊┊⋆ ˚｡⋆୨୧˚\n┊⋆ ˚｡⋆୨୧˚\n⋆ ˚｡⋆୨୧˚",
    tags: ["staircase", "pattern", "stars"],
  },
  {
    id: "sym-009",
    name: "Wave Line",
    category: "Aesthetic",
    art: "•︵•︵•︵•︵•︵•︵•︵•︵•︵•︵•︵•︵•",
    tags: ["wave", "line", "dots"],
  },
  {
    id: "sym-010",
    name: "Glitch Field",
    category: "Glitch",
    art: "t̷̪̊ḧ̷́͜i̷̮͐s̷͚̈́ ̶͎̒k̵̫̆i̶͚͝n̷̺̎d̷͉̋ ̶͇̒ơ̷̩f̷̱̈́ ̶͎̒t̵͇͑ë̵͜x̷̹̾t̴̩͑",
    tags: ["glitch", "text", "zalgo"],
  },
  {
    id: "sym-011",
    name: "Vaporwave Title",
    category: "Aesthetic",
    art: "【﻿ａｅｓｔｈｅｔｉｃ　ｖｉｂｅｓ】",
    tags: ["vaporwave", "aesthetic", "title"],
  },
  {
    id: "sym-012",
    name: "Flower Stream",
    category: "Aesthetic",
    art: "⎯⎯∈🌸≋≋≋≋≋̯̫⌁⌁⌁⌁⌁●●●●●",
    tags: ["flower", "stream", "pattern"],
  },
];

/**
 * Search for kotomoji based on text input
 * @param searchText Text to search for in name, category, art or tags
 * @returns Array of matching KotomojiEntry objects
 */
export function searchKotomoji(searchText: string): KotomojiEntry[] {
  if (!searchText) return kotomojiLibrary.slice(0, 30); // Return first 30 results for empty search

  const lowercaseKeyword = searchText.toLowerCase();

  return kotomojiLibrary.filter(
    (entry) =>
      entry.name.toLowerCase().includes(lowercaseKeyword) ||
      entry.category.toLowerCase().includes(lowercaseKeyword) ||
      entry.art.includes(searchText) ||
      (entry.tags && entry.tags.some((tag) => tag.toLowerCase().includes(lowercaseKeyword))),
  );
}

/**
 * Get all available categories in the library
 * @returns Array of unique categories
 */
export function getCategories(): string[] {
  const categories = new Set<string>();
  kotomojiLibrary.forEach((entry) => categories.add(entry.category));
  return Array.from(categories).sort();
}

/**
 * Get all available tags in the library
 * @returns Array of unique tags
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  kotomojiLibrary.forEach((entry) => {
    if (entry.tags) {
      entry.tags.forEach((tag) => tags.add(tag));
    }
  });
  return Array.from(tags).sort();
}

/**
 * Get kotomoji by category
 * @param category Category to filter by
 * @returns Array of KotomojiEntry objects in the specified category
 */
export function getKotomojiByCategory(category: string): KotomojiEntry[] {
  return kotomojiLibrary.filter((entry) => entry.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get kotomoji by tag
 * @param tag Tag to filter by
 * @returns Array of KotomojiEntry objects with the specified tag
 */
export function getKotomojiByTag(tag: string): KotomojiEntry[] {
  return kotomojiLibrary.filter((entry) => entry.tags && entry.tags.some((t) => t.toLowerCase() === tag.toLowerCase()));
}

/**
 * Get a random kotomoji
 * @param category Optional category to filter by
 * @returns A random KotomojiEntry object
 */
export function getRandomKotomoji(category?: string): KotomojiEntry {
  const filteredLibrary = category ? kotomojiLibrary.filter((entry) => entry.category === category) : kotomojiLibrary;

  const randomIndex = Math.floor(Math.random() * filteredLibrary.length);
  return filteredLibrary[randomIndex];
}
