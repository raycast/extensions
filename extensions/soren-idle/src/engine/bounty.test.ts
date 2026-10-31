import { describe, expect, it } from "vitest";
import { BOARD_REFRESH_MS, TASKS } from "./data";
import { abandonBounty, acceptBounty, boardCapacity, bountyLevel, bountyTarget, rerollBoard } from "./bounty";
import { advance, build, newGame, startTask, xpForLevel } from "./engine";
import { nextRandom } from "./rng";
import { GameState } from "./types";

const MINUTE = 60_000;

/** A strong survivor with a freshly built Bounty Board. */
function withBoard(patch: Partial<GameState> = {}): GameState {
  const base = newGame(0);
  const s: GameState = {
    ...base,
    contactAt: 0,
    buildings: { translator: 1 },
    inventory: { ration: 400, alloy_plate: 12, circuit_scrap: 10, scrap_metal: 30 },
    xp: { ...base.xp, combat: xpForLevel(88), engineering: xpForLevel(58) },
    hp: 1000,
    ...patch,
  };
  const built = build(s, "bounty_board");
  expect(built.error).toBeUndefined();
  return built.state;
}

describe("rng", () => {
  it("is deterministic for a seed and stays in [0, 1)", () => {
    const a = { rng: 42 };
    const b = { rng: 42 };
    for (let i = 0; i < 1000; i++) {
      const x = nextRandom(a);
      expect(x).toBe(nextRandom(b));
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("the Bounty Board", () => {
  it("needs contact, a translator and materials", () => {
    expect(build(newGame(0), "bounty_board").error).toBeTruthy();
    const ready = {
      ...newGame(0),
      contactAt: 0,
      buildings: { translator: 1 },
      inventory: { alloy_plate: 12, circuit_scrap: 10, scrap_metal: 30 },
      xp: { ...newGame(0).xp, engineering: xpForLevel(43) },
    } as GameState;
    expect(build(ready, "bounty_board").error).toBeUndefined();
    expect(build({ ...ready, contactAt: null }, "bounty_board").error).toBeTruthy();
  });

  it("posts bounties up to its capacity, upgrades add more", () => {
    const s = withBoard();
    expect(s.board.offers).toHaveLength(boardCapacity(s));
    const upgraded = build(
      {
        ...s,
        inventory: { alloy_plate: 99, glyph_tablet: 99, resonance_coil: 9 },
      },
      "bounty_board",
    ).state;
    expect(upgraded.board.offers).toHaveLength(4);
  });

  it("only asks for creatures you can fight", () => {
    const s = withBoard({ xp: { ...newGame(0).xp, combat: 0, engineering: xpForLevel(58) } });
    expect(s.board.offers.length).toBeGreaterThan(0);
    for (const offer of s.board.offers) expect(bountyTarget(offer).levelReq).toBe(1);
  });

  it("gives every bounty a poster and a line, and pays more for harder ones", () => {
    const s = withBoard();
    for (const o of s.board.offers) {
      expect(o.poster).toBeTruthy();
      expect(o.line).not.toMatch(/\{m\}/);
      expect(o.marks).toBeGreaterThanOrEqual(o.count);
    }
  });

  it("allows one active bounty at a time", () => {
    const s = withBoard();
    const [first, second] = s.board.offers;
    const accepted = acceptBounty(s, first.id);
    expect(accepted.error).toBeUndefined();
    expect(accepted.state.board.offers.find((o) => o.id === first.id)).toBeUndefined();
    expect(acceptBounty(accepted.state, second.id).error).toBeTruthy();
    expect(acceptBounty(s, 9999).error).toBeTruthy();
  });

  it("counts kills only while the matching hunt runs, offline too, then pays out", () => {
    let s = withBoard();
    const bounty = s.board.offers[0];
    s = acceptBounty(s, bounty.id).state;
    const task = bountyTarget(bounty);

    // a different hunt does nothing
    const other = TASKS.find((t) => t.monster && t.id !== task.id && !t.boss)!;
    const idle = advance(startTask(s, other.id).state, 30 * MINUTE).state;
    expect(idle.board.active?.progress).toBe(0);

    // the right one works through offline simulation
    const started = startTask(s, task.id).state;
    const { state, report } = advance(started, bounty.count * task.durationMs + 1);
    expect(report.bounties).toHaveLength(1);
    expect(state.marks).toBe(bounty.marks);
    expect(state.bountyXp).toBe(bounty.xp);
    expect(state.stats.bounties).toBe(1);
    expect(state.board.active).toBeNull();
    expect(state.board.offers).toHaveLength(boardCapacity(state));
  });

  it("raises the bounty level", () => {
    expect(bountyLevel({ ...newGame(0), bountyXp: 0 })).toBe(1);
    expect(bountyLevel({ ...newGame(0), bountyXp: 60 })).toBe(2);
    expect(bountyLevel({ ...newGame(0), bountyXp: 240 })).toBe(3);
  });

  it("refreshes unclaimed offers on a timer", () => {
    const s = withBoard();
    const before = s.board.offers.map((o) => o.id);
    const { state } = advance(s, BOARD_REFRESH_MS + 1);
    expect(state.board.offers.map((o) => o.id)).not.toEqual(before);
    expect(state.board.refreshAt).toBeGreaterThan(BOARD_REFRESH_MS);
  });

  it("costs Marks to reroll or abandon", () => {
    const s = withBoard();
    expect(rerollBoard(s).error).toBeTruthy();
    const rich = { ...s, marks: 50 };
    const rolled = rerollBoard(rich);
    expect(rolled.state.marks).toBe(40);
    expect(rolled.state.board.offers.map((o) => o.id)).not.toEqual(s.board.offers.map((o) => o.id));

    const active = acceptBounty(rich, rich.board.offers[0].id).state;
    expect(abandonBounty({ ...active, marks: 0 }).error).toBeTruthy();
    const dropped = abandonBounty(active);
    expect(dropped.state.board.active).toBeNull();
    expect(dropped.state.marks).toBe(45);
  });

  it("is deterministic: the same save posts the same bounties", () => {
    const a = withBoard();
    const b = withBoard();
    expect(a.board.offers).toEqual(b.board.offers);
  });
});
