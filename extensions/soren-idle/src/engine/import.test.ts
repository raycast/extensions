import { describe, expect, it } from "vitest";
import { newGame } from "./engine";
import { exportSave, importSave } from "./migrate";

const damaged = (patch: Record<string, unknown>) =>
  JSON.stringify({ ...JSON.parse(exportSave(newGame(1000))), ...patch });

describe("importing a save", () => {
  it("accepts an exported save", () => {
    expect(importSave(exportSave(newGame(1000))).state?.lastTick).toBe(1000);
  });

  it.each([
    ["buffs", { buffs: null }],
    ["board", { board: "x" }],
    ["plots", { plots: {} }],
    ["hp", { hp: "full" }],
    ["buffs entries", { buffs: { speed: 3 } }],
    ["inventory amounts", { inventory: { glowcap: "many" } }],
    ["stats", { stats: { cycles: 1, hunts: null, produced: {} } }],
  ])("turns away a save with damaged %s", (_, patch) => {
    const { state, error } = importSave(damaged(patch));
    expect(state).toBeUndefined();
    expect(error).toMatch(/damaged/);
  });

  it("still reports text that is not a save", () => {
    expect(importSave("hello").error).toMatch(/not contain a save/);
  });
});
