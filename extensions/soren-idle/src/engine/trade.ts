import { GREETINGS, HUB_SELL_RATES, ITEMS, STOCK, TRANSLATOR_DISCOUNTS } from "./data";
import { buildingLevel, count, isGear, roomFor } from "./engine";
import { GameState, ItemId, StockItem } from "./types";

export const hubLevel = (s: GameState) => buildingLevel(s, "hub");
export const translatorLevel = (s: GameState) => buildingLevel(s, "translator");

/** Trading only happens at the Hub. */
export const canTrade = (s: GameState) => hubLevel(s) > 0;

/** A line from the locals matching how well you can talk to them. */
export const greeting = (s: GameState) => GREETINGS[translatorLevel(s)];

// --- selling ----------------------------------------------------------------

export { isGear };

/** Share of an item's value the locals pay. Before a Hub exists this shows the first level's rate. */
export function sellRate(s: GameState): number {
  return HUB_SELL_RATES[Math.max(1, hubLevel(s)) - 1];
}

export function sellPrice(s: GameState, id: ItemId): number {
  return Math.max(1, Math.floor(ITEMS[id].value * sellRate(s)));
}

/** How many of an item the player wants to hold on to when selling. */
export function keepCount(s: GameState, id: ItemId): number {
  return Math.max(isGear(id) ? 1 : 0, s.keep[id] ?? 0);
}

export function sellableCount(s: GameState, id: ItemId): number {
  if (ITEMS[id].unsellable) return 0;
  return Math.max(0, Math.floor(count(s, id)) - keepCount(s, id));
}

/** Sets how many of an item `sell` leaves alone. */
export function setKeep(s: GameState, id: ItemId, n: number): GameState {
  const keep = { ...s.keep };
  if (n > 0) keep[id] = Math.floor(n);
  else delete keep[id];
  return { ...s, keep };
}

export function sell(
  s: GameState,
  id: ItemId,
  qty: number | "all",
): { state: GameState; error?: string; credits?: number; amount?: number } {
  if (!canTrade(s)) return { state: s, error: "Build a Trading Hub first" };
  const available = sellableCount(s, id);
  const amount = qty === "all" ? available : Math.min(qty, available);
  if (amount < 1) {
    return {
      state: s,
      error: ITEMS[id].unsellable
        ? "The locals will not buy that"
        : count(s, id) < 1
          ? "Nothing to sell"
          : (s.keep[id] ?? 0) > 0
            ? "Keeping the ones you set aside"
            : "Keeping your only one",
    };
  }
  const credits = amount * sellPrice(s, id);
  const next = structuredClone(s);
  next.inventory[id] = count(s, id) - amount;
  next.credits += credits;
  next.stats.creditsEarned += credits;
  return { state: next, credits, amount };
}

/** Sells everything the keep settings allow. */
export function sellEverything(s: GameState): {
  state: GameState;
  error?: string;
  credits?: number;
} {
  if (!canTrade(s)) return { state: s, error: "Build a Trading Hub first" };
  let state = s;
  let credits = 0;
  for (const id of Object.keys(ITEMS) as ItemId[]) {
    const sold = sell(state, id, "all");
    if (!sold.error) {
      state = sold.state;
      credits += sold.credits ?? 0;
    }
  }
  return credits ? { state, credits } : { state: s, error: "Nothing to sell" };
}

// --- buying -----------------------------------------------------------------

export function buyDiscount(s: GameState): number {
  return TRANSLATOR_DISCOUNTS[Math.max(1, translatorLevel(s)) - 1];
}

export function buyPrice(s: GameState, stock: StockItem): number {
  return Math.ceil(stock.price * (1 - buyDiscount(s)));
}

/** What the locals offer you at your current Translation Device level. */
export function stockFor(s: GameState): StockItem[] {
  return STOCK.filter((x) => x.tier <= translatorLevel(s));
}

export function spendCredits(s: GameState, amount: number): { state: GameState; error?: string } {
  if (s.credits < amount) return { state: s, error: "Not enough Credits" };
  return { state: { ...s, credits: s.credits - amount } };
}

/** Buys `qty` of an item, or as many as the Credits and the storage room allow when `qty` is "max". */
export function buy(
  s: GameState,
  id: ItemId,
  qty: number | "max",
): { state: GameState; error?: string; cost?: number; amount?: number } {
  if (!canTrade(s)) return { state: s, error: "Build a Trading Hub first" };
  const stock = stockFor(s).find((x) => x.item === id);
  if (!stock) return { state: s, error: "The locals do not offer that yet" };
  const price = buyPrice(s, stock);
  const amount = qty === "max" ? Math.min(Math.floor(s.credits / price), roomFor(s, id)) : qty;
  if (roomFor(s, id) < Math.max(1, amount)) return { state: s, error: "Not enough room in storage" };
  if (amount < 1) return { state: s, error: "Not enough Credits" };
  const cost = amount * price;
  const paid = spendCredits(s, cost);
  if (paid.error) return { state: s, error: paid.error };
  const next = structuredClone(paid.state);
  next.inventory[id] = count(next, id) + amount;
  return { state: next, cost, amount };
}

/** The most of an item the player can currently afford, at least 1 so the UI can show the price. */
export const affordable = (s: GameState, stock: StockItem) => Math.floor(s.credits / buyPrice(s, stock));
