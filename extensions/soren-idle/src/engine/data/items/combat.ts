import { ItemDef, ItemId } from "../../types";

export const COMBAT_ITEMS: Partial<Record<ItemId, ItemDef>> = {
  chitin_shard: {
    id: "chitin_shard",
    name: "Chitin Shard",
    description: "Light, hard, and still slightly twitchy.",
    value: 2,
  },
  xeno_core: {
    id: "xeno_core",
    name: "Xeno Core",
    description: "A dense organ that pulses with strange energy.",
    value: 100,
  },
  matriarch_chitin: {
    id: "matriarch_chitin",
    name: "Matriarch Chitin",
    description: "A plate of the Hive Matriarch's shell. Dense, warm and very much not yours.",
    value: 120,
  },
  broodking_fang: {
    id: "broodking_fang",
    name: "Broodking Fang",
    description: "As long as your forearm, and still sharp enough to matter.",
    value: 700,
  },
  sovereign_shard: {
    id: "sovereign_shard",
    name: "Sovereign Shard",
    description: "A sliver of the Hollow Sovereign. It is cold in a way that has nothing to do with temperature.",
    value: 1500,
  },
  venom_sac: {
    id: "venom_sac",
    name: "Venom Sac",
    description: "Taken from the canyon things that bite back. Still dripping.",
    value: 120,
    unsellable: true,
  },
  glow_gland: {
    id: "glow_gland",
    name: "Glow Gland",
    description: "The cave dwellers' lantern. It keeps shining after you take it.",
    value: 200,
    unsellable: true,
  },
  void_pearl: {
    id: "void_pearl",
    name: "Void Pearl",
    description: "Something the Rift coughed up. It weighs less than nothing.",
    value: 400,
    unsellable: true,
  },
};
