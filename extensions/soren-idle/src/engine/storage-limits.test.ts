import { describe, expect, it } from "vitest";
import { MAX_OFFLINE_MS, OFFLINE_BONUS_HOURS, STORAGE_CAPS } from "./data";
import {
  advance,
  build,
  buildingCredits,
  newGame,
  offlineCapMs,
  roomFor,
  startTask,
  storageCap,
  xpForLevel,
} from "./engine";
import { harvest, plant } from "./hydroponics";
import { buy } from "./trade";
import { GameState } from "./types";

const HOUR = 3_600_000;

const withState = (patch: Partial<GameState> = {}): GameState => ({ ...newGame(0), ...patch });

describe("storage limits", () => {
  it("cap every stack, and a depot raises the cap", () => {
    expect(storageCap(newGame(0))).toBe(STORAGE_CAPS[0]);
    expect(storageCap(withState({ buildings: { storage: 3 } }))).toBe(STORAGE_CAPS[3]);
  });

  it("stop a task when its output would overflow, and say why", () => {
    const s = startTask(
      withState({ inventory: { scrap_metal: STORAGE_CAPS[0] - 2 } }),
      "salvage_hull",
    ).state;
    const { state, report } = advance(s, 10 * 60_000);
    expect(state.inventory.scrap_metal).toBe(STORAGE_CAPS[0]);
    expect(report.stoppedReason).toMatch(/Storage full: Scrap Metal/);
    expect(state.activeTask).toBeNull();
  });

  it("keep gear out of it", () => {
    const s = withState({ inventory: { cutting_torch: 5 } });
    expect(roomFor(s, "cutting_torch")).toBe(Infinity);
  });

  it("stop drones and purchases at the limit instead of overflowing", () => {
    const drone = withState({
      buildings: { salvage_drone: 10, generator: 5 },
      inventory: { scrap_metal: STORAGE_CAPS[0] - 1 },
    });
    expect(advance(drone, HOUR).state.inventory.scrap_metal).toBe(STORAGE_CAPS[0]);

    const hub = withState({
      buildings: { hub: 1, translator: 1 },
      contactAt: 0,
      credits: 1000,
      inventory: { star_honey: STORAGE_CAPS[0] },
    });
    expect(buy(hub, "star_honey", 1).error).toMatch(/room/);
  });

  it("refuse a harvest that would not fit", () => {
    const s = withState({
      buildings: { hydroponic_bay: 1 },
      inventory: { glowcap: 2 },
    });
    const planted = plant(s, 0, "glowcap_bed").state;
    const full = {
      ...planted,
      lastTick: 10 * HOUR,
      inventory: { glowcap: STORAGE_CAPS[0] - 1 },
    };
    expect(harvest(full, 0).error).toMatch(/Storage full/);
  });

  it("let building a depot cost Credits at higher levels", () => {
    expect(buildingCredits(withState(), "storage")).toBe(0);
    const s = withState({
      buildings: { storage: 2 },
      credits: 10,
      inventory: { alloy_plate: 99, circuit_scrap: 99 },
      xp: { ...newGame(0).xp, engineering: xpForLevel(28) },
    });
    expect(buildingCredits(s, "storage")).toBe(300);
    expect(build(s, "storage").error).toMatch(/Credits/);
    const paid = build({ ...s, credits: 350 }, "storage");
    expect(paid.error).toBeUndefined();
    expect(paid.state.credits).toBe(50);
    expect(paid.state.buildings.storage).toBe(3);
  });
});

describe("offline cap", () => {
  it("is 12 hours, and the Stasis Pod adds hours per level", () => {
    expect(offlineCapMs(newGame(0))).toBe(MAX_OFFLINE_MS);
    const pod = withState({ buildings: { stasis_pod: 2 } });
    expect(offlineCapMs(pod)).toBe(MAX_OFFLINE_MS + 2 * OFFLINE_BONUS_HOURS * HOUR);
  });

  it("limits what advance() simulates", () => {
    const pod = withState({ buildings: { stasis_pod: 1 } });
    expect(advance(pod, 100 * HOUR).report.elapsedMs).toBe(16 * HOUR);
    expect(advance(newGame(0), 100 * HOUR).report.elapsedMs).toBe(12 * HOUR);
  });
});
