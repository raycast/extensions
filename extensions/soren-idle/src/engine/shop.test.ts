import { describe, expect, it } from "vitest";
import { acceptBounty, bountyLevel, huntable } from "./bounty";
import { BOUNTY_SHOP } from "./data";
import { count, newGame, xpForLevel } from "./engine";
import { buyFromShop, shopStatus } from "./shop";
import { canTrade, sell, sellableCount, sellEverything } from "./trade";
import { GameState } from "./types";

const withShop = (patch: Partial<GameState> = {}): GameState => ({
  ...newGame(0),
  buildings: { bounty_board: 1, hub: 1 },
  ...patch,
});

describe("the Bounty Shop", () => {
  it("needs a Bounty Board", () => {
    expect(buyFromShop({ ...newGame(0), marks: 999, bountyXp: 9999 }, "stim_pack").error).toMatch(
      /Bounty Board/,
    );
  });

  it("enforces the bounty level", () => {
    const s = withShop({ marks: 9999, bountyXp: 0 });
    expect(shopStatus(s, BOUNTY_SHOP[1])).toBe("locked");
    expect(buyFromShop(s, "sorenian_lance").error).toMatch(/Bounty level 4/);
  });

  it("enforces the mark cost", () => {
    const s = withShop({ marks: 10, bountyXp: 9999 });
    const entry = BOUNTY_SHOP.find((e) => e.item === "sorenian_lance")!;
    expect(shopStatus(s, entry)).toBe("poor");
    expect(buyFromShop(s, "sorenian_lance").error).toMatch(/Not enough/);
  });

  it("takes the Marks and hands over the item", () => {
    const s = withShop({ marks: 700, bountyXp: 9999 });
    const bought = buyFromShop(s, "sorenian_lance");
    expect(bought.error).toBeUndefined();
    expect(bought.state.marks).toBe(100);
    expect(count(bought.state, "sorenian_lance")).toBe(1);
  });

  it("sells gear once but consumables again", () => {
    const rich = withShop({ marks: 5000, bountyXp: 9999 });
    const gear = buyFromShop(rich, "sorenian_lance").state;
    expect(buyFromShop(gear, "sorenian_lance").error).toMatch(/already own/);
    const first = buyFromShop(rich, "stim_pack").state;
    const second = buyFromShop(first, "stim_pack");
    expect(count(second.state, "stim_pack")).toBe(2);
  });

  it("sells only things the Hub will not buy back", () => {
    const s = withShop({ inventory: { sorenian_lance: 1, stim_pack: 3 } });
    expect(canTrade(s)).toBe(true);
    expect(sellableCount(s, "stim_pack")).toBe(0);
    expect(sell(s, "stim_pack", "all").error).toMatch(/will not buy/);
    expect(sellEverything(s).error).toBeTruthy();
  });

  it("unlocks harder bounty tiers with bounty level", () => {
    const strong = (bountyXp: number) => ({
      ...newGame(0),
      xp: { ...newGame(0).xp, combat: xpForLevel(88) },
      bountyXp,
    });
    const tiers = (s: GameState) =>
      new Set(huntable(s).map((t) => (t.levelReq < 8 ? 1 : t.levelReq < 20 ? 2 : 3)));
    expect([...tiers(strong(0))]).toEqual([1]);
    expect(bountyLevel(strong(60))).toBe(2);
    expect(tiers(strong(60))).toEqual(new Set([1, 2]));
    expect(tiers(strong(540))).toEqual(new Set([1, 2, 3]));
  });

  it("keeps acceptBounty importable alongside", () => {
    expect(typeof acceptBounty).toBe("function");
  });
});
