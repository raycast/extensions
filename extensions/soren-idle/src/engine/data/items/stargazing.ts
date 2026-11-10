import { ItemDef, ItemId } from "../../types";

export const STARGAZING_ITEMS: Partial<Record<ItemId, ItemDef>> = {
  star_dust: {
    id: "star_dust",
    name: "Star Dust",
    description: "Swept off the instruments each morning.",
    value: 3,
  },
  comet_ice: {
    id: "comet_ice",
    name: "Comet Ice",
    description: "A fragment of a passing comet. It does not melt.",
    value: 14,
  },
  nebula_gas: {
    id: "nebula_gas",
    name: "Nebula Gas",
    description: "Bottled color from the far side of the sky.",
    value: 102,
  },
  pulsar_dust: {
    id: "pulsar_dust",
    name: "Pulsar Dust",
    description: "It ticks, very quickly, in the jar.",
    value: 590,
  },
  the_hunter: {
    id: "the_hunter",
    name: "The Hunter",
    description: "Charted. Deal 1 more damage per combat round, for good.",
    value: 0,
    unsellable: true,
    constellation: { damage: 1 },
  },
  the_loom: {
    id: "the_loom",
    name: "The Loom",
    description: "Charted. Every task takes 5% less time, for good.",
    value: 0,
    unsellable: true,
    constellation: { speed: 0.95 },
  },
  the_crown: {
    id: "the_crown",
    name: "The Crown",
    description: "Charted. Rare finds are 20% more likely, for good.",
    value: 0,
    unsellable: true,
    constellation: { rare: 1.2 },
  },
  the_ferryman: {
    id: "the_ferryman",
    name: "The Ferryman",
    description: "Charted. Gathering and crafting give 10% more, for good.",
    value: 0,
    unsellable: true,
    constellation: { yield: 1.1 },
  },
  meteor_glass: {
    id: "meteor_glass",
    name: "Meteor Glass",
    description: "A smear of green glass, still faintly warm.",
    value: 63,
  },
  aurora_vapor: {
    id: "aurora_vapor",
    name: "Aurora Vapor",
    description: "It shimmers in the jar and will not stay one color.",
    value: 399,
  },
  quasar_dust: {
    id: "quasar_dust",
    name: "Quasar Dust",
    description: "It is very old, very bright, and very far.",
    value: 1272,
  },
  void_light: {
    id: "void_light",
    name: "Void Light",
    description: "Black, but it glows. It is the nicest thing you have found.",
    value: 1960,
  },
};
