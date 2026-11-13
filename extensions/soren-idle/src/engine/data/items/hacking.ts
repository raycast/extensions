import { ItemDef, ItemId } from "../../types";

export const HACKING_ITEMS: Partial<Record<ItemId, ItemDef>> = {
  relic_fragment: {
    id: "relic_fragment",
    name: "Relic Fragment",
    description: "A shard of something old and engraved. Collectors will pay.",
    value: 6,
  },
  vault_cipher: {
    id: "vault_cipher",
    name: "Vault Cipher",
    description: "The key to one lock, written on a tile you cannot read.",
    value: 22,
  },
  data_crystal: {
    id: "data_crystal",
    name: "Data Crystal",
    description: "Holds a vault's records. The locals call it a library.",
    value: 70,
  },
  warden_chip: {
    id: "warden_chip",
    name: "Warden Chip",
    description: "The mind of a vault guardian, switched off. Mostly.",
    value: 180,
  },
  heart_key: {
    id: "heart_key",
    name: "Heart Key",
    description: "It opens the one door that none of the other keys did.",
    value: 600,
  },
  signal_key: {
    id: "signal_key",
    name: "Signal Key",
    description: "A key that opens things by saying a very long word.",
    value: 63,
  },
  cipher_engine: {
    id: "cipher_engine",
    name: "Cipher Engine",
    description: "A palm-sized machine that does nothing but make keys.",
    value: 150,
  },
  sentinel_mind: {
    id: "sentinel_mind",
    name: "Sentinel Mind",
    description: "A mind in a box, quiet. Do not ask it anything.",
    value: 522,
  },
  oracle_core: {
    id: "oracle_core",
    name: "Oracle Core",
    description: "It knows what you wanted to ask. It would rather not say.",
    value: 841,
  },
  gate_key: {
    id: "gate_key",
    name: "Gate Key",
    description: "A thin sheet of light that fits every lock on the continent.",
    value: 1272,
  },
  prime_key: {
    id: "prime_key",
    name: "Prime Key",
    description: "It is warm. It is not an object. It is a permission.",
    value: 1831,
  },
};
