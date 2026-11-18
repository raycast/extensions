import { ItemDef, ItemId } from "../../types";

export const EXPLORATION_ITEMS: Partial<Record<ItemId, ItemDef>> = {
  field_notes: {
    id: "field_notes",
    name: "Field Notes",
    description: "Sketches and bearings from the ridge. Useful to somebody.",
    value: 5,
  },
  canyon_survey: {
    id: "canyon_survey",
    name: "Canyon Survey",
    description: "Every ledge and drop of the canyon, measured.",
    value: 20,
  },
  cave_atlas: {
    id: "cave_atlas",
    name: "Cave Atlas",
    description: "A map of tunnels that did not stay put while you drew it.",
    value: 60,
  },
  lake_charts: {
    id: "lake_charts",
    name: "Lake Charts",
    description: "Depths, currents and a few places marked as best avoided.",
    value: 150,
  },
  deep_atlas: {
    id: "deep_atlas",
    name: "Deep Atlas",
    description: "The whole region on one sheet. The locals framed their copy.",
    value: 450,
  },
  salt_atlas: {
    id: "salt_atlas",
    name: "Salt Atlas",
    description: "Every waypoint marked with a stone you could not carry.",
    value: 63,
  },
  forest_atlas: {
    id: "forest_atlas",
    name: "Forest Atlas",
    description: "A map of a forest that has no ground.",
    value: 150,
  },
  storm_log: {
    id: "storm_log",
    name: "Storm Log",
    description: "Wet pages, still legible, still a bit alarmed.",
    value: 522,
  },
  ruin_map: {
    id: "ruin_map",
    name: "Ruin Map",
    description: "A city's worth of streets, and no one living in any of them.",
    value: 841,
  },
  rift_chart: {
    id: "rift_chart",
    name: "Rift Chart",
    description: "A chart of the edge, drawn very carefully from a distance.",
    value: 1272,
  },
  world_atlas: {
    id: "world_atlas",
    name: "World Atlas",
    description: "Everything you have found, on a single sheet.",
    value: 1831,
  },
};
