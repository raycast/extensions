import { ItemDef, ItemId } from "../../types";

export const SMELTING_ITEMS: Partial<Record<ItemId, ItemDef>> = {
  ferrite_ingot: {
    id: "ferrite_ingot",
    name: "Ferrite Ingot",
    description: "Smelted ore, cast into a neat bar.",
    value: 10,
  },
  carbon_steel: {
    id: "carbon_steel",
    name: "Carbon Steel",
    description: "Ferrite hardened with burnt glowcap. Holds an edge.",
    value: 40,
  },
  lumina_glass: {
    id: "lumina_glass",
    name: "Lumina Glass",
    description: "Crystal melted into sheets that hum faintly.",
    value: 90,
  },
  chitin_alloy: {
    id: "chitin_alloy",
    name: "Chitin Alloy",
    description: "Shell and steel fused. Light, tough and a little bit alive.",
    value: 220,
  },
  xeno_alloy: {
    id: "xeno_alloy",
    name: "Xeno Alloy",
    description: "A metal that did not exist until you made it.",
    value: 600,
  },
  cobalt_bar: {
    id: "cobalt_bar",
    name: "Cobalt Bar",
    description: "A deep blue bar, cold in the hand and heavy.",
    value: 55,
  },
  argent_bar: {
    id: "argent_bar",
    name: "Argent Bar",
    description: "It reflects you very well, and a bit too kindly.",
    value: 334,
  },
  voidsteel: {
    id: "voidsteel",
    name: "Voidsteel",
    description: "A black bar. It absorbs the heat of the crucible and keeps it.",
    value: 1654,
  },
  song_glass: {
    id: "song_glass",
    name: "Songglass",
    description: "Flick the edge and it rings for a full minute.",
    value: 1737,
  },
  dark_alloy: {
    id: "dark_alloy",
    name: "Dark Alloy",
    description: "Everything about it is heavier than it appears.",
    value: 4537,
  },
  starfall_ingot: {
    id: "starfall_ingot",
    name: "Starfall Ingot",
    description: "A bar of something that was once a falling star.",
    value: 9468,
  },
};
