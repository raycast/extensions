// The tiling layouts by name. The last one used is remembered, so Rotate, Swap, Grow Master and
// Pivot rerun it instead of picking a layout of their own.

import {
  MASTER_RATIO,
  master,
  nextPivot,
  rotated,
  rows,
  sidebar,
  stacking,
  swappedNext,
  transposed,
  withMaster,
  type Item,
  type Layout,
} from "./layouts";
import {
  cache,
  distributeDisplays,
  listWindows,
  moveAll,
  moveOthers,
  openPanel,
  panelTitle,
  placeWindows,
  prefs,
  run,
  swapDisplays,
  tile,
  type Panel,
} from "./raycast";
import { smartPlan } from "./roles";

const NAMES = ["auto-tile", "auto-tile-sidebar", "master-left", "master-right", "master-center"] as const;
export type TileName = (typeof NAMES)[number];
const isMaster = (name: TileName) => name.startsWith("master-");

const SIDEBAR_WIDTH = 200; // asked for, then the app clamps to its real minimum

const LAST = "last-tile";
const SPLIT = "split"; // "columns" when Pivot has turned Auto Tile on its side
const SHAPE = "shape"; // what Pivot chose: "line" or "grid". Unset, Auto Tile decides by window count.
/** Auto Tile on its own puts up to three windows in a line and more in a grid. */
const AUTO_GRID_FROM = 4;
const RATIO = "master-ratio";

const last = (): TileName => {
  const name = cache.get(LAST) as TileName | undefined;
  return name && NAMES.includes(name) ? name : "auto-tile";
};
const ratio = () => Number(cache.get(RATIO)) || MASTER_RATIO;

/**
 * A tiling layout, the window it pins in place if any, and the Raycast window it pins. When a display has
 * more windows than fit, the smallest share a slot.
 */
function build(
  name: TileName,
  lead: "focused" | "largest" = "largest",
): { layout: Layout; pinned?: (i: Item) => boolean; panel?: Panel } {
  const tiled = layoutFor(name, lead);
  return { ...tiled, layout: stacking(tiled.layout, tiled.pinned) };
}

function layoutFor(
  name: TileName,
  lead: "focused" | "largest",
): { layout: Layout; pinned?: (i: Item) => boolean; panel?: Panel } {
  const { gap, sidebar: choice } = prefs();
  // Auto Tile is a grid of two rows, or one line of windows. Either can be turned on its side.
  const shape = cache.get(SHAPE);
  // Asked for a grid, three windows are enough to make one: two above and one below
  const flat = shape === "line" ? rows(1, gap) : rows(2, gap, shape === "grid" ? 3 : AUTO_GRID_FROM);
  const grid = cache.get(SPLIT) === "columns" ? transposed(flat) : flat;
  switch (name) {
    case "auto-tile":
      return { layout: grid };
    case "master-left":
      return { layout: master({ side: "left", ratio: ratio(), gap, lead }) };
    case "master-right":
      return { layout: master({ side: "right", ratio: ratio(), gap, lead }) };
    case "master-center":
      return { layout: master({ side: "center", ratio: ratio(), gap, lead }) };
    case "auto-tile-sidebar": {
      // Raycast Notes or AI Chat, or else whichever window is active
      const panel = choice === "active" ? undefined : choice;
      const pinned = (i: Item) => (panel ? i.title === panelTitle(panel) : !!i.active);
      return { layout: sidebar(pinned, SIDEBAR_WIDTH, grid, gap), pinned, panel };
    }
  }
}

/**
 * Tiles every window and remembers the layout. Opens the sidebar's Raycast window if needed.
 * A master layout takes the focused window as its master. Rotate, Swap and Grow Master then keep
 * whichever window is master, wherever the focus goes.
 */
export function runTile(name: TileName) {
  cache.set(LAST, name);
  const { layout, panel } = build(name, "focused");
  return tile(layout, panel && (() => openPanel(panel)));
}

/**
 * Reruns the last layout, changed by `change`, on the display with the active window only.
 * The sidebar stays pinned.
 */
function retile(change: (layout: Layout, pinned?: (i: Item) => boolean) => Layout, name = last()) {
  const { layout, pinned, panel } = build(name);
  return tile(change(layout, pinned), panel && (async () => panelTitle(panel)), true);
}

/** Every window one slot clockwise (1) or counterclockwise (-1). Hyprland's rollnext and rollprev. */
export const rotateTile = (step: 1 | -1) => retile((layout, pinned) => rotated(layout, step, pinned));

/** The active window trades places with the next one round. Hyprland's swapnext. */
export const swapNext = () => retile((layout, pinned) => swappedNext(layout, pinned));

/** The active window trades places with the biggest one. Hyprland's swapwithmaster. */
export const swapWithMaster = () => retile((layout, pinned) => withMaster(layout, pinned));

/** The master takes a bigger or smaller share. Hyprland's mfact. Switches to Master Layout Left if needed. */
export function resizeMaster(delta: number) {
  cache.set(RATIO, String(Math.min(0.85, Math.max(0.15, Math.round((ratio() + delta) * 100) / 100))));
  const name = isMaster(last()) ? last() : "master-left";
  cache.set(LAST, name);
  return retile((layout) => layout, name);
}

/**
 * Auto Tile turns to its next shape, on the active display: side by side, then a grid of two rows, then
 * that grid on its side. It starts from what is showing now, so the first press always changes something.
 */
export async function pivot() {
  // Without the window count, Auto Tile's own choice can't be told, so a line is assumed.
  // retileGrid reports the reason if windows can't be read at all.
  const { windows } = await listWindows().catch(() => ({ windows: [] }));
  const display = windows.find((w) => w.focused)?.display ?? 0;
  const count = windows.filter((w) => w.display === display).length;
  const shape = cache.get(SHAPE);
  const showsGrid = shape === "grid" || (shape !== "line" && count >= AUTO_GRID_FROM);
  const next = nextPivot({ shape: showsGrid ? "grid" : "line", sideways: cache.get(SPLIT) === "columns" }, count);
  cache.set(SHAPE, next.shape);
  cache.set(SPLIT, next.sideways ? "columns" : "rows");
  return retileGrid();
}

/** Reruns Auto Tile, keeping the sidebar if that was the last layout. */
function retileGrid() {
  const name = last() === "auto-tile-sidebar" ? "auto-tile-sidebar" : "auto-tile";
  cache.set(LAST, name);
  return retile((layout) => layout, name);
}

/**
 * Every window moves to the next display. If you have tiled before, they land in the last layout you used,
 * so they fit the new screen. Otherwise each keeps its place and size relative to the screen.
 */
export function swapDisplaysTile() {
  const name = cache.get(LAST) as TileName | undefined;
  if (!name || !NAMES.includes(name)) return swapDisplays();
  const { layout, panel } = build(name);
  return swapDisplays({ layout, include: panel && panelTitle(panel) });
}

/** Spreads every window over every display, then tiles each with the last layout used. */
export function distributeTile() {
  const { layout, panel } = build(last());
  return distributeDisplays({ layout, include: panel && panelTitle(panel) }, layoutFor(last(), "largest").layout);
}

/** The layouts the AI can pick for a display. The sidebar layout is left out: it pins by preference. */
export const AI_LAYOUTS = ["auto-tile", "master-left", "master-right", "master-center"] as const;
export type AiLayout = (typeof AI_LAYOUTS)[number];

/**
 * Arranges windows the way the AI planned: which display each is on, in what order, in which layout.
 * The first window listed for a master layout is the master. Returns what happened, for the AI to relay.
 */
export function arrangePlan(plan: { display: number; layout?: string; windows: string[] }[]) {
  const layoutName = (display: number): TileName => {
    const asked = plan.find((p) => p.display === display)?.layout as AiLayout | undefined;
    if (asked && AI_LAYOUTS.includes(asked)) return asked;
    // The sidebar layout pins by preference, which a plan can't express
    return last() === "auto-tile-sidebar" ? "auto-tile" : last();
  };
  const placed = new Map(plan.flatMap((p) => p.windows.map((id, rank) => [id, { display: p.display, rank }] as const)));
  if (plan[0]) cache.set(LAST, layoutName(plan[0].display));
  return placeWindows(placed, (display) => build(layoutName(display)).layout);
}

/**
 * Arranges everything by what each app is for: the focused window leads the largest display with the rest
 * of the work beside it, and chat, mail and music go to the other displays.
 */
export const smartArrange = () =>
  run(async () => {
    const planNow = async () => {
      const { displays, windows, fits } = await listWindows();
      // Checked against the plain layout: stacking would hide a display that is too full
      return smartPlan(windows, displays, (display, ids, layout) =>
        fits(display, ids, layoutFor(layout, "largest").layout),
      );
    };
    const plan = await planNow();
    const result = await arrangePlan(plan);
    // Arranging can reveal that two apps are too big to share a display. Knowing that, the plan may
    // change, so it is worked out once more and applied if it has.
    const again = await planNow();
    return JSON.stringify(again) === JSON.stringify(plan) ? result : arrangePlan(again);
  });

/** The focused window keeps its display. The others there move to the next display, in the last layout. */
export function moveOthersTile() {
  const { layout, panel } = build(last());
  return moveOthers({ layout, include: panel && panelTitle(panel) });
}

/** Every window on the other displays comes to the focused window's display, in the last layout. */
export function moveAllTile() {
  const { layout, panel } = build(last());
  return moveAll({ layout, include: panel && panelTitle(panel) });
}
