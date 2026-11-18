import { ItemDef, ItemId } from "../../types";

export const SALVAGING_ITEMS: Partial<Record<ItemId, ItemDef>> = {
  scrap_metal: {
    id: "scrap_metal",
    name: "Scrap Metal",
    description: "Twisted hull plating. Mostly still metal.",
    value: 2,
  },
  circuit_scrap: {
    id: "circuit_scrap",
    name: "Circuit Scrap",
    description: "Fried boards with a few good components left.",
    value: 5,
  },
  void_lens: {
    id: "void_lens",
    name: "Void Lens",
    description: "A lens ground from something that is not quite glass.",
    value: 150,
  },
  prism_geode: {
    id: "prism_geode",
    name: "Prism Geode",
    description: "Crack it open and the light inside splits into colors you have no names for.",
    value: 120,
  },
  nav_core: {
    id: "nav_core",
    name: "Intact Nav Core",
    description: "The navigation unit from a ship that was not yours. Still warm.",
    value: 250,
  },
  flight_recorder: {
    id: "flight_recorder",
    name: "Flight Recorder",
    description: "Sealed, scorched and still ticking. The locals pay well for other people's last words.",
    value: 500,
  },
  amber_bulb: {
    id: "amber_bulb",
    name: "Amber Bulb",
    description: "A sweetroot that grew around something and kept it. You can see it moving.",
    value: 180,
  },
  engine_casing: {
    id: "engine_casing",
    name: "Engine Casing",
    description: "Heavy, scorched and somehow still warm.",
    value: 29,
  },
  drive_coil: {
    id: "drive_coil",
    name: "Drive Coil",
    description: "Copper wound by machines that did not need sleep.",
    value: 201,
  },
  shield_slab: {
    id: "shield_slab",
    name: "Shield Slab",
    description: "A slab of hull that took a lot of punishment and kept going.",
    value: 377,
  },
  nav_array: {
    id: "nav_array",
    name: "Nav Array",
    description: "Still pointing home, whichever way you turn it.",
    value: 638,
  },
  bridge_console: {
    id: "bridge_console",
    name: "Bridge Console",
    description: "Every switch labelled, none of them in a language you know now.",
    value: 999,
  },
  black_box: {
    id: "black_box",
    name: "Black Box",
    description: "It remembers the crash better than you do.",
    value: 1479,
  },
  ship_core: {
    id: "ship_core",
    name: "Reactor Core",
    description: "The heart of your ship. It stopped beating, but not for good.",
    value: 2095,
  },
};
