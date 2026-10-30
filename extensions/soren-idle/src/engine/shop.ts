import { BOUNTY_SHOP, ITEMS } from "./data";
import { boardLevel, bountyLevel } from "./bounty";
import { autoEquip, count, isGear, roomFor } from "./engine";
import { GameState, ItemId, ShopEntry } from "./types";

export const shopOpen = (s: GameState) => boardLevel(s) > 0;

/** Gear is bought once; consumables can be bought again. */
export const isOwned = (s: GameState, entry: ShopEntry) =>
  isGear(entry.item) && count(s, entry.item) > 0;

export type ShopStatus = "owned" | "locked" | "poor" | "ready";

export function shopStatus(s: GameState, entry: ShopEntry): ShopStatus {
  if (isOwned(s, entry)) return "owned";
  if (bountyLevel(s) < entry.levelReq) return "locked";
  return s.marks >= entry.cost ? "ready" : "poor";
}

export function buyFromShop(
  s: GameState,
  id: ItemId,
): { state: GameState; error?: string; cost?: number } {
  if (!shopOpen(s)) return { state: s, error: "Build a Bounty Board first" };
  const entry = BOUNTY_SHOP.find((e) => e.item === id);
  if (!entry) return { state: s, error: "The shop does not sell that" };
  if (isOwned(s, entry)) return { state: s, error: "You already own this" };
  if (bountyLevel(s) < entry.levelReq)
    return { state: s, error: `Requires Bounty level ${entry.levelReq}` };
  if (s.marks < entry.cost) return { state: s, error: "Not enough Bounty Marks" };
  if (roomFor(s, id) < 1) return { state: s, error: "Not enough room in storage" };
  const next = structuredClone(s);
  next.marks -= entry.cost;
  next.inventory[id] = count(s, id) + 1;
  autoEquip(next, id);
  return { state: next, cost: entry.cost };
}

export const shopItemName = (entry: ShopEntry) => ITEMS[entry.item].name;
