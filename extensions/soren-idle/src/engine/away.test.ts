import { describe, expect, it } from "vitest";
import { awayLines, awayMarkdown, clearAway, recordAway, skillLines } from "./away";
import { advance, newGame, startTask } from "./engine";
import { exportSave, importSave } from "./migrate";
import { emptyReport, isQuiet, mergeReports } from "./report";
import { GameState } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const roomy = { buildings: { storage: 5 } } as Partial<GameState>;
const mining = () => startTask({ ...newGame(0), ...roomy }, "mine_ferrite").state;

describe("away report", () => {
  it("breaks time, tasks, XP and items down by skill", () => {
    const { report } = advance(mining(), HOUR);
    const part = report.skills.mining;
    expect(part).toBeDefined();
    expect(part?.ms).toBe(HOUR);
    expect(part?.cycles).toBe(report.cycles);
    expect(part?.xp).toBe(report.xp.mining);
    expect(part?.items.ferrite_ore).toBe(report.items.ferrite_ore);
    expect(Object.keys(report.skills)).toEqual(["mining"]);
  });

  it("counts only the time actually worked when a task stops early", () => {
    // five glowcaps make two rations, then the run is out of materials
    const s = startTask({ ...newGame(0), inventory: { glowcap: 5 } }, "craft_ration").state;
    const { report } = advance(s, HOUR);
    expect(report.skills.cooking?.cycles).toBe(2);
    expect(report.skills.cooking?.ms).toBe(2 * 3000);
    expect(report.stoppedReason).toMatch(/Out of materials/);
  });

  it("keeps drones apart from the survivor's work", () => {
    const s = { ...mining(), buildings: { salvage_drone: 2, generator: 5, storage: 5 } };
    const { report } = advance(s, HOUR);
    expect(report.passive.scrap_metal).toBe((HOUR / 20_000) * 2);
    expect(report.items.scrap_metal).toBe(report.passive.scrap_metal);
    expect(report.skills.salvaging).toBeUndefined();
  });

  it("is empty for an idle survivor", () => {
    const { report } = advance(newGame(0), HOUR);
    expect(isQuiet(report)).toBe(true);
    expect(skillLines(report)).toEqual([]);
  });

  it("lists rare finds, level-ups and why a task stopped", () => {
    const { report } = advance(mining(), 12 * HOUR);
    const lines = awayLines(report).join("\n");
    expect(lines).toMatch(/^Mining 12h 0m · [\d,]+ tasks · \+[\d,]+ XP · [\d,]+× Ferrite Ore/m);
    expect(lines).toMatch(/Mining reached level/);
    expect(lines).toMatch(/★ Rare finds: .*Prism Geode/);
    expect(awayMarkdown(report)).toMatch(/# While you were away\n\*\*12h 0m\*\*/);
  });
});

describe("mergeReports", () => {
  it("adds everything up, and keeps the latest stop reason", () => {
    const a = advance(mining(), HOUR).report;
    const b = advance(mining(), 2 * HOUR).report;
    b.stoppedReason = "Storage full: Ferrite Ore";
    const sum = mergeReports(structuredClone(a), b);
    expect(sum.elapsedMs).toBe(3 * HOUR);
    expect(sum.cycles).toBe(a.cycles + b.cycles);
    expect(sum.skills.mining?.ms).toBe(3 * HOUR);
    expect(sum.items.ferrite_ore).toBe((a.items.ferrite_ore ?? 0) + (b.items.ferrite_ore ?? 0));
    expect(sum.stoppedReason).toBe("Storage full: Ferrite Ore");
  });
});

describe("what happened since you looked", () => {
  it("accumulates the menu bar's ticks, skips quiet ones, and clears when you look", () => {
    let s = mining();
    for (let t = 1; t <= 30; t++) {
      const { state, report } = advance(s, t * MINUTE);
      s = recordAway(state, report);
    }
    expect(s.unseen?.elapsedMs).toBe(30 * MINUTE);
    expect(s.unseen?.skills.mining?.ms).toBe(30 * MINUTE);

    const idle = recordAway(newGame(0), advance(newGame(0), HOUR).report);
    expect(idle.unseen).toBeNull();

    expect(clearAway(s).unseen).toBeNull();
    expect(clearAway(idle)).toBe(idle);
  });

  it("is saved, and missing from an old save", () => {
    let s = mining();
    const { state, report } = advance(s, 10 * MINUTE);
    s = recordAway(state, report);
    expect(importSave(exportSave(s)).state?.unseen?.cycles).toBe(s.unseen?.cycles);

    const old = { ...newGame(0), version: 3 } as Partial<GameState>;
    delete old.unseen;
    expect(importSave(JSON.stringify(old)).state?.unseen).toBeNull();
  });
});

describe("emptyReport", () => {
  it("starts with nothing", () => {
    expect(isQuiet(emptyReport())).toBe(true);
  });
});
