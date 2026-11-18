import { ItemDef, ItemId } from "../../types";

export const MINING_ITEMS: Partial<Record<ItemId, ItemDef>> = {
  ferrite_ore: {
    id: "ferrite_ore",
    name: "Ferrite Ore",
    description: "Dense, dark ore. Magnetic enough to annoy your compass.",
    value: 3,
  },
  lumina_crystal: {
    id: "lumina_crystal",
    name: "Lumina Crystal",
    description: "Glows faintly. Hums when you hold it.",
    value: 25,
  },
  star_sapphire: {
    id: "star_sapphire",
    name: "Star Sapphire",
    description: "A deep blue stone with a six-pointed glint that follows your eye.",
    value: 400,
  },
  cobalt_ore: {
    id: "cobalt_ore",
    name: "Cobalt Ore",
    description: "Dense and blue, and it stains your gloves the same.",
    value: 5,
  },
  argent_ore: {
    id: "argent_ore",
    name: "Argent Ore",
    description: "Bright metal that never tarnishes, which the locals find suspicious.",
    value: 76,
  },
  magma_geode: {
    id: "magma_geode",
    name: "Magma Geode",
    description: "Warm to the touch, years after it left the fire.",
    value: 174,
  },
  voidstone: {
    id: "voidstone",
    name: "Voidstone",
    description: "It is lighter than it looks. It is also darker.",
    value: 336,
  },
  song_crystal: {
    id: "song_crystal",
    name: "Song Crystal",
    description: "Hold it to your ear and it answers a question you have not asked.",
    value: 578,
  },
  dark_shard: {
    id: "dark_shard",
    name: "Dark Shard",
    description: "A splinter of something the scanner reports as nothing.",
    value: 918,
  },
  starfall_iron: {
    id: "starfall_iron",
    name: "Starfall Iron",
    description: "It arrived at speed. It still looks pleased about it.",
    value: 1373,
  },
  mountain_heart: {
    id: "mountain_heart",
    name: "Mountain Heart",
    description: "A fist of glowing stone that beats once a minute.",
    value: 1960,
  },
};
