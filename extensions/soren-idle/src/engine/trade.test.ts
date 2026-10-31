import { describe, expect, it } from "vitest";
import { HUB_SELL_RATES, ITEMS, STOCK } from "./data";
import { build, count, eat, maxHp, newGame, storageCap, xpForLevel } from "./engine";
import {
  buy,
  buyDiscount,
  buyPrice,
  canTrade,
  sell,
  sellableCount,
  sellPrice,
  sellRate,
  spendCredits,
  stockFor,
} from "./trade";
import { GameState, ItemId } from "./types";

function trader(inventory: Partial<Record<ItemId, number>>, { hub = 1, translator = 1, credits = 0 } = {}): GameState {
  return {
    ...newGame(1000),
    contactAt: 0,
    credits,
    inventory,
    buildings: { hub, translator },
    xp: { ...newGame().xp, engineering: xpForLevel(88) },
  };
}

describe("item values", () => {
  it("every item the locals buy is worth something", () => {
    for (const item of Object.values(ITEMS)) if (!item.unsellable) expect(item.value, item.id).toBeGreaterThan(0);
  });

  it("everything the locals sell costs more than it pays out", () => {
    for (const stock of STOCK) expect(stock.price).toBeGreaterThan(ITEMS[stock.item].value);
  });
});

describe("selling", () => {
  it("needs a Trading Hub", () => {
    expect(sell(newGame(0), "scrap_metal", 1).error).toMatch(/Trading Hub/);
    expect(canTrade(trader({}, { hub: 0 }))).toBe(false);
  });

  it("pays the sell price per unit and removes the items", () => {
    const s = trader({ ferrite_ore: 10 });
    const { state, credits } = sell(s, "ferrite_ore", 4);
    expect(credits).toBe(4 * sellPrice(s, "ferrite_ore"));
    expect(state.credits).toBe(credits);
    expect(count(state, "ferrite_ore")).toBe(6);
  });

  it("pays more as the hub levels up, up to the full value", () => {
    const rates = [1, 2, 3, 4, 5].map((hub) => sellRate(trader({}, { hub })));
    expect(rates).toEqual(HUB_SELL_RATES);
    expect(sellPrice(trader({}, { hub: 5 }), "lumina_crystal")).toBe(ITEMS.lumina_crystal.value);
    expect(sellPrice(trader({}, { hub: 1 }), "lumina_crystal")).toBeLessThan(ITEMS.lumina_crystal.value);
  });

  it("buys everything the player can own", () => {
    const everything = Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 5])) as Record<ItemId, number>;
    let s = trader(everything);
    for (const id of Object.keys(ITEMS) as ItemId[]) {
      if (sellableCount(s, id) > 0) s = sell(s, id, "all").state;
    }
    expect(s.credits).toBeGreaterThan(0);
  });

  it("sells everything with 'all' and clamps oversized quantities", () => {
    expect(count(sell(trader({ glowcap: 7 }), "glowcap", "all").state, "glowcap")).toBe(0);
    expect(count(sell(trader({ glowcap: 7 }), "glowcap", 99).state, "glowcap")).toBe(0);
  });

  it("refuses when there is nothing to sell", () => {
    expect(sell(trader({}), "scrap_metal", 1).error).toMatch(/Nothing/);
  });

  it("keeps one copy of equipment", () => {
    const s = trader({ cutting_torch: 1, pulse_blade: 3 });
    expect(sellableCount(s, "cutting_torch")).toBe(0);
    expect(sell(s, "cutting_torch", 1).error).toMatch(/only one/);
    expect(sellableCount(s, "pulse_blade")).toBe(2);
  });

  it("does not mutate the original state", () => {
    const s = trader({ scrap_metal: 5 });
    sell(s, "scrap_metal", 5);
    expect(count(s, "scrap_metal")).toBe(5);
    expect(s.credits).toBe(0);
  });
});

describe("buying", () => {
  it("only offers goods up to the Translation Device level", () => {
    const tiers = [1, 2, 3, 4, 5].map((translator) => stockFor(trader({}, { translator })).length);
    expect(tiers[0]).toBe(STOCK.filter((x) => x.tier <= 1).length);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
    expect(tiers[4]).toBe(STOCK.length);
  });

  it("charges the price and hands over the goods", () => {
    const s = trader({}, { credits: 500 });
    const { state, cost } = buy(s, "glyph_tablet", 3);
    expect(cost).toBe(3 * 60);
    expect(state.credits).toBe(500 - 180);
    expect(count(state, "glyph_tablet")).toBe(3);
  });

  it("buys as many as the Credits allow when asked for the most", () => {
    const { state, amount } = buy(trader({}, { credits: 200 }), "glyph_tablet", "max");
    expect(amount).toBe(3);
    expect(count(state, "glyph_tablet")).toBe(3);
    expect(state.credits).toBe(200 - 180);
  });

  it("stops at the storage room instead of refusing the whole purchase", () => {
    const cap = storageCap(trader({}));
    const s = trader({ glyph_tablet: cap - 2 }, { credits: 9999 });
    const { state, amount, error } = buy(s, "glyph_tablet", "max");
    expect(error).toBeUndefined();
    expect(amount).toBe(2);
    expect(count(state, "glyph_tablet")).toBe(cap);
    expect(buy(state, "glyph_tablet", "max").error).toMatch(/room/);
    expect(buy(trader({}, { credits: 10 }), "glyph_tablet", "max").error).toMatch(/Not enough Credits/);
  });

  it("refuses without credits, a hub, or the right Translation Device level", () => {
    expect(buy(trader({}, { credits: 10 }), "glyph_tablet", 1).error).toMatch(/Not enough/);
    expect(buy(trader({}, { hub: 0, credits: 999 }), "glyph_tablet", 1).error).toMatch(/Hub/);
    expect(buy(trader({}, { credits: 9999 }), "void_lens", 1).error).toMatch(/not offer/);
  });

  it("gives a discount from Translation Device level 3", () => {
    expect([1, 2, 3, 4, 5].map((translator) => buyDiscount(trader({}, { translator })))).toEqual([
      0, 0, 0.05, 0.1, 0.15,
    ]);
    const stock = STOCK.find((x) => x.item === "glyph_tablet")!;
    expect(buyPrice(trader({}, { translator: 5 }), stock)).toBeLessThan(buyPrice(trader({}, { translator: 1 }), stock));
  });
});

describe("spendCredits", () => {
  it("deducts or refuses", () => {
    const rich = { ...newGame(0), credits: 100 };
    expect(spendCredits(rich, 40).state.credits).toBe(60);
    expect(spendCredits(rich, 101).error).toMatch(/Not enough/);
  });
});

describe("Trading Hub", () => {
  const ready = (): GameState => ({
    ...trader({ alloy_plate: 999, circuit_scrap: 999, scrap_metal: 999 }, { hub: 0, translator: 1 }),
  });

  it("needs a Translation Device first", () => {
    expect(build({ ...ready(), buildings: {} }, "hub").error).toMatch(/Translation Device/);
  });

  it("needs first contact", () => {
    expect(build({ ...ready(), contactAt: null }, "hub").error).toMatch(/nobody to talk to/);
  });

  it("can be built and upgraded once the requirements are met", () => {
    const { state, error } = build(ready(), "hub");
    expect(error).toBeUndefined();
    expect(canTrade(state)).toBe(true);
  });
});

describe("local food", () => {
  it("honey rations heal more than rations, and the weakest food is eaten first", () => {
    const s = { ...trader({ ration: 1, honey_ration: 1 }), hp: 1 };
    const first = eat(s);
    expect(first.state.hp).toBe(1 + (ITEMS.ration.heal ?? 0));
    expect(count(first.state, "ration")).toBe(0);
    expect(count(first.state, "honey_ration")).toBe(1);
    expect(eat(s, "honey_ration").state.hp).toBe(Math.min(maxHp(s), 1 + (ITEMS.honey_ration.heal ?? 0)));
    expect(ITEMS.honey_ration.heal).toBeGreaterThan(ITEMS.ration.heal ?? 0);
  });
});
