import { describe, expect, it } from "vitest";
import { CONTACT_DELAY_MS } from "./data";
import { advance, build, contactRemainingMs, firstContact, newGame, xpForLevel } from "./engine";
import { migrateSave } from "./migrate";
import { GameState } from "./types";

function readyToBuild(): GameState {
  return {
    ...newGame(1000),
    xp: { ...newGame().xp, engineering: xpForLevel(58) },
    inventory: { alloy_plate: 50, circuit_scrap: 50, lumina_crystal: 50 },
  };
}

describe("first contact", () => {
  it("has no contact before a beacon exists", () => {
    const s = newGame(0);
    expect(firstContact(s)).toBe(false);
    expect(contactRemainingMs(s)).toBeNull();
  });

  it("needs engineering level 12 to build the beacon", () => {
    expect(build({ ...readyToBuild(), xp: newGame().xp }, "beacon").error).toMatch(/Requires/);
  });

  it("starts a timer when the beacon is built", () => {
    const { state } = build(readyToBuild(), "beacon");
    expect(state.contactAt).toBe(1000 + CONTACT_DELAY_MS);
    expect(contactRemainingMs(state)).toBe(CONTACT_DELAY_MS);
  });

  it("announces contact exactly once, even across a long offline gap", () => {
    const { state } = build(readyToBuild(), "beacon");
    const early = advance(state, 1000 + CONTACT_DELAY_MS - 1);
    expect(early.report.notices).toEqual([]);
    expect(firstContact(early.state)).toBe(false);

    const arrive = advance(early.state, 1000 + CONTACT_DELAY_MS + 5 * 60 * 60 * 1000);
    expect(arrive.report.notices).toHaveLength(1);
    expect(firstContact(arrive.state)).toBe(true);
    expect(contactRemainingMs(arrive.state)).toBeNull();

    expect(advance(arrive.state, arrive.state.lastTick + 1000).report.notices).toEqual([]);
  });

  it("does not let the beacon be built twice", () => {
    const { state } = build(readyToBuild(), "beacon");
    expect(build(state, "beacon").error).toMatch(/max level/);
  });
});

describe("migrateSave", () => {
  it("fills in fields added later", () => {
    const old = { ...newGame(5) } as Partial<GameState>;
    delete old.credits;
    delete old.contactAt;
    const migrated = migrateSave(old);
    expect(migrated.credits).toBe(0);
    expect(migrated.contactAt).toBeNull();
  });

  it("treats a beacon from an older save as contact already made", () => {
    const old = { ...newGame(5), version: 1, buildings: { beacon: 1 } } as Partial<GameState>;
    delete old.contactAt;
    const migrated = migrateSave(old);
    expect(firstContact(migrated)).toBe(true);
  });

  it("keeps skill xp for skills the save already has", () => {
    const old = { ...newGame(5), xp: { mining: 99 } } as unknown as Partial<GameState>;
    const migrated = migrateSave(old);
    expect(migrated.xp.mining).toBe(99);
    expect(migrated.xp.combat).toBe(0);
  });
});
