import { ItemDef, ItemId } from "../../types";

export const FORAGING_ITEMS: Partial<Record<ItemId, ItemDef>> = {
  glowcap: {
    id: "glowcap",
    name: "Glowcap",
    description: "Bioluminescent fungus. Your scanner says it is probably edible.",
    value: 2,
  },
  sweetroot: {
    id: "sweetroot",
    name: "Sweetroot",
    description: "A starchy tuber. Tastes like regret and sugar.",
    value: 4,
  },
  golden_spore: {
    id: "golden_spore",
    name: "Golden Spore",
    description: "A single spore the color of old brass. It smells like the inside of a bell.",
    value: 100,
  },
  pale_berry: {
    id: "pale_berry",
    name: "Pale Berry",
    description: "Sour at first, sweet after, and it numbs your tongue.",
    value: 3,
  },
  thornvine: {
    id: "thornvine",
    name: "Thornvine",
    description: "Stripped of its thorns it is sweet, and ropey.",
    value: 41,
  },
  mistbloom: {
    id: "mistbloom",
    name: "Mistbloom",
    description: "Petals that hold a breath of cold air for days.",
    value: 109,
  },
  ember_pod: {
    id: "ember_pod",
    name: "Ember Pod",
    description: "A seed case that stays hot long after it is picked.",
    value: 230,
  },
  whisper_moss: {
    id: "whisper_moss",
    name: "Whisper Moss",
    description: "Soft, damp and quietly talkative.",
    value: 422,
  },
  ghost_orchid: {
    id: "ghost_orchid",
    name: "Ghost Orchid",
    description: "The petals go clear when you look straight at them.",
    value: 701,
  },
  sunfruit: {
    id: "sunfruit",
    name: "Sunfruit",
    description: "Sweet enough to hurt, and warm all the way through.",
    value: 1085,
  },
  sky_lily: {
    id: "sky_lily",
    name: "Sky Lily",
    description: "Light as breath, and it floats if you let go.",
    value: 1591,
  },
  elder_bloom: {
    id: "elder_bloom",
    name: "Elder Bloom",
    description: "You are not sure whether you picked it or it let you.",
    value: 2236,
  },
};
