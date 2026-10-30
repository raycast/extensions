import { CROP_BY_ID } from "./data";
import {
  buildingLevel,
  canAfford,
  count,
  emptyReport,
  gainXp,
  levelOf,
  overflowing,
} from "./engine";
import { ITEMS } from "./data";
import { Bundle, GameState, ItemId, Plot, Report } from "./types";

/** One plot per Hydroponic Bay level. */
export const plotCount = (s: GameState) => buildingLevel(s, "hydroponic_bay");

export const plotAt = (s: GameState, index: number): Plot | null => s.plots[index] ?? null;

export const cropReadyAt = (plot: Plot) => plot.plantedAt + CROP_BY_ID[plot.crop].growMs;

export const isRipe = (s: GameState, plot: Plot) => s.lastTick >= cropReadyAt(plot);

/** Milliseconds until the plot can be harvested; 0 when ripe. */
export const growRemainingMs = (s: GameState, plot: Plot) =>
  Math.max(0, cropReadyAt(plot) - s.lastTick);

export const ripeCount = (s: GameState) =>
  Array.from({ length: plotCount(s) }, (_, i) => plotAt(s, i)).filter((p) => p && isRipe(s, p))
    .length;

export function plant(
  s: GameState,
  index: number,
  cropId: string,
): { state: GameState; error?: string } {
  const crop = CROP_BY_ID[cropId];
  if (!crop) return { state: s, error: "Unknown crop" };
  if (index < 0 || index >= plotCount(s)) return { state: s, error: "No such plot" };
  if (plotAt(s, index)) return { state: s, error: "Something is already growing there" };
  if (levelOf(s, "hydroponics") < crop.levelReq)
    return { state: s, error: `Requires Hydroponics level ${crop.levelReq}` };
  if (!canAfford(s, crop.seeds)) return { state: s, error: "Missing seeds" };
  const next = structuredClone(s);
  for (const [id, n] of Object.entries(crop.seeds) as [ItemId, number][])
    next.inventory[id] = count(s, id) - n;
  next.plots = Array.from({ length: plotCount(s) }, (_, i) => plotAt(next, i));
  next.plots[index] = { crop: cropId, plantedAt: s.lastTick };
  return { state: next };
}

export function harvest(
  s: GameState,
  index: number,
): { state: GameState; error?: string; report?: Report } {
  const plot = plotAt(s, index);
  if (!plot) return { state: s, error: "Nothing is planted there" };
  if (!isRipe(s, plot)) return { state: s, error: "Not ripe yet" };
  const crop = CROP_BY_ID[plot.crop];
  const full = overflowing(s, crop.yield);
  if (full) return { state: s, error: `Storage full: ${ITEMS[full].name}` };
  const next = structuredClone(s);
  const report = emptyReport();
  for (const [id, n] of Object.entries(crop.yield) as [ItemId, number][]) {
    next.inventory[id] = count(next, id) + n;
    report.items[id] = n;
    next.stats.produced[id] = (next.stats.produced[id] ?? 0) + n;
  }
  gainXp(next, "hydroponics", crop.xp, report);
  next.plots[index] = null;
  next.stats.cycles++;
  return { state: next, report };
}

/** Harvests every ripe plot. */
export function harvestAll(s: GameState): { state: GameState; error?: string; items?: Bundle } {
  let state = s;
  const items: Bundle = {};
  for (let i = 0; i < plotCount(s); i++) {
    const done = harvest(state, i);
    if (done.error) continue;
    state = done.state;
    for (const [id, n] of Object.entries(done.report?.items ?? {}) as [ItemId, number][])
      items[id] = (items[id] ?? 0) + n;
  }
  return state === s ? { state: s, error: "Nothing is ripe" } : { state, items };
}
