import { EquipSlot, ItemDef, ItemId } from "../../types";
import { SALVAGING_ITEMS } from "./salvaging";
import { MINING_ITEMS } from "./mining";
import { FORAGING_ITEMS } from "./foraging";
import { COOKING_ITEMS } from "./cooking";
import { ENGINEERING_ITEMS } from "./engineering";
import { FABRICATION_ITEMS } from "./fabrication";
import { COMBAT_ITEMS } from "./combat";
import { MISC_ITEMS } from "./misc";
import { XENOFISHING_ITEMS } from "./xenofishing";
import { XENOCHEMISTRY_ITEMS } from "./xenochemistry";
import { SMELTING_ITEMS } from "./smelting";
import { HACKING_ITEMS } from "./hacking";
import { EXPLORATION_ITEMS } from "./exploration";
import { COMPANIONS_ITEMS } from "./companions";
import { STARGAZING_ITEMS } from "./stargazing";

// Each file holds the items one skill makes. Together they cover every ItemId.
export const ITEMS = {
  ...SALVAGING_ITEMS,
  ...MINING_ITEMS,
  ...FORAGING_ITEMS,
  ...COOKING_ITEMS,
  ...ENGINEERING_ITEMS,
  ...FABRICATION_ITEMS,
  ...COMBAT_ITEMS,
  ...MISC_ITEMS,
  ...XENOFISHING_ITEMS,
  ...XENOCHEMISTRY_ITEMS,
  ...SMELTING_ITEMS,
  ...HACKING_ITEMS,
  ...EXPLORATION_ITEMS,
  ...COMPANIONS_ITEMS,
  ...STARGAZING_ITEMS,
} as Record<ItemId, ItemDef>;

/** The slots, in the order they are listed. */
export const EQUIP_SLOTS: { id: EquipSlot; name: string }[] = [
  { id: "weapon", name: "Weapon" },
  { id: "body", name: "Body" },
  { id: "head", name: "Head" },
  { id: "salvager", name: "Salvaging Tool" },
  { id: "miner", name: "Mining Tool" },
  { id: "forager", name: "Foraging Tool" },
  { id: "charm", name: "Charm" },
  { id: "companion", name: "Companion" },
];
