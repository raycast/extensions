// The tiling layouts by name. The last one used is remembered, so Rotate, Swap, Grow Master and
// Pivot rerun it instead of picking a layout of their own.

import { closeMainWindow, getPreferenceValues } from "@raycast/api";
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
  isPanel,
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

const NAMES = ["auto-tile", "master-left", "master-right", "master-center"] as const;
/** A layout for the windows. The sidebar isn't one: it is pinned beside whichever layout is in use. */
export type TileName = (typeof NAMES)[number];
const isMaster = (name: TileName) => name.startsWith("master-");

const SIDEBAR_WIDTH = 400; // asked for. An app that needs more keeps its real minimum.

const LAST = "last-tile";
const SIDEBAR = "sidebar"; // "on" while a sidebar is pinned. Layouts then arrange the rest around it.
const PINNED = "sidebar-window"; // what is pinned: "notes", "ai", or the id of a window
/** What `last-tile` held when the sidebar was a layout of its own. */
const OLD_SIDEBAR_LAYOUT = "auto-tile-sidebar";
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
const sidebarOn = () => cache.get(SIDEBAR) === "on" || (!cache.get(SIDEBAR) && cache.get(LAST) === OLD_SIDEBAR_LAYOUT);

type Built = {
  layout: Layout;
  pinned?: (i: Item) => boolean;
  /** The Raycast window pinned as the sidebar, if it is one. */
  panel?: Panel;
  /** Opens the sidebar's window if it isn't open. Resolves to a Raycast window's title, to find it by. */
  open?: () => Promise<string | undefined>;
};

/**
 * A tiling layout, with the sidebar pinned beside it when one is on: the window it pins, and the Raycast
 * window that is, if any. When a display has more windows than fit, the smallest share a slot.
 */
function build(name: TileName, lead: "focused" | "largest" = "largest", withSidebar = sidebarOn()): Built {
  const tiled = withSidebar ? beside(layoutFor(name, lead)) : { layout: layoutFor(name, lead) };
  return { ...tiled, layout: stacking(tiled.layout, tiled.pinned) };
}

/** `layout` with the sidebar pinned down the right of it. */
function beside(layout: Layout): Built {
  const { gap } = prefs();
  const what = cache.get(PINNED) ?? "notes";
  // Raycast Notes or AI Chat, found by title, or the one window that was focused when it was pinned
  const pinned = (i: Item) => (isPanel(what) ? i.title === panelTitle(what) : i.id === what);
  const built: Built = { layout: sidebar(pinned, SIDEBAR_WIDTH, layout, gap), pinned };
  return isPanel(what) ? { ...built, panel: what, open: () => openPanel(what) } : built;
}

/** The layout on its own, without a sidebar or stacking. */
function layoutFor(name: TileName, lead: "focused" | "largest"): Layout {
  const { gap } = prefs();
  // Auto Tile is a grid of two rows, or one line of windows. Either can be turned on its side.
  const shape = cache.get(SHAPE);
  // Asked for a grid, three windows are enough to make one: two above and one below
  const flat = shape === "line" ? rows(1, gap) : rows(2, gap, shape === "grid" ? 3 : AUTO_GRID_FROM);
  switch (name) {
    case "auto-tile":
      return cache.get(SPLIT) === "columns" ? transposed(flat) : flat;
    case "master-left":
      return master({ side: "left", ratio: ratio(), gap, lead });
    case "master-right":
      return master({ side: "right", ratio: ratio(), gap, lead });
    case "master-center":
      return master({ side: "center", ratio: ratio(), gap, lead });
  }
}

/**
 * Tiles every window and remembers the layout. Opens the sidebar's Raycast window if needed.
 * A master layout takes the focused window as its master. Rotate, Swap and Grow Master then keep
 * whichever window is master, wherever the focus goes.
 */
export function runTile(name: TileName, done?: string) {
  // Settled before `last-tile` changes, which is where an older version kept it
  cache.set(SIDEBAR, sidebarOn() ? "on" : "off");
  cache.set(LAST, name);
  const { layout, open } = build(name, "focused");
  return tile(layout, open, false, done);
}

/**
 * Pins the sidebar, or lets it go, and tiles again in the layout already in use. While it is pinned,
 * every layout arranges the other windows beside it. What gets pinned is Toggle Sidebar's own preference:
 * Raycast Notes or AI Chat, opened if needed, or the window that has focus right now.
 */
export async function toggleSidebar() {
  const on = !sidebarOn();
  if (on) {
    const choice = getPreferenceValues<Preferences.ToggleSidebar>().sidebar ?? "notes";
    if (isPanel(choice)) {
      cache.set(PINNED, choice);
    } else {
      // Focus is on Raycast until its window closes
      await closeMainWindow();
      const focused = (await listWindows().catch(() => ({ windows: [] }))).windows.find((w) => w.focused);
      if (!focused) {
        return run(async () => {
          throw new Error("Click into the window you want as the sidebar, then run Toggle Sidebar again.");
        });
      }
      cache.set(PINNED, focused.id);
    }
  }
  cache.set(SIDEBAR, on ? "on" : "off");
  // Whichever window is master stays master
  const { layout, open } = build(last());
  return tile(layout, open, false, on ? "Sidebar pinned" : "Sidebar unpinned");
}

/** The sides Cycle Master Layout steps through, with what to call each. */
const MASTER_CYCLE: [TileName, string][] = [
  ["master-left", "Master Layout Left"],
  ["master-right", "Master Layout Right"],
  ["master-center", "Master Layout Center"],
];

/** Tiles with the master on the next side round, and says which. Hyprland's orientationnext. */
export function cycleMaster() {
  // From any other layout it starts on the left
  const at = MASTER_CYCLE.findIndex(([name]) => name === last());
  const [name, title] = MASTER_CYCLE[(at + 1) % MASTER_CYCLE.length];
  return runTile(name, title);
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

/** Reruns Auto Tile. A pinned sidebar stays. */
function retileGrid() {
  cache.set(LAST, "auto-tile");
  return retile((layout) => layout, "auto-tile");
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
  return distributeDisplays({ layout, include: panel && panelTitle(panel) }, layoutFor(last(), "largest"));
}

/**
 * Arranges windows the way the AI planned: which display each is on, in what order, in which layout.
 * The first window listed for a master layout is the master. Returns what happened, for the AI to relay.
 */
export function arrangePlan(plan: { display: number; layout?: string; windows: string[] }[]) {
  const layoutName = (display: number): TileName => {
    const asked = plan.find((p) => p.display === display)?.layout as TileName | undefined;
    return asked && NAMES.includes(asked) ? asked : last();
  };
  const placed = new Map(plan.flatMap((p) => p.windows.map((id, rank) => [id, { display: p.display, rank }] as const)));
  if (plan[0]) cache.set(LAST, layoutName(plan[0].display));
  // A plan says where every window goes, so no sidebar is pinned, now or by what follows
  cache.set(SIDEBAR, "off");
  return placeWindows(placed, (display) => build(layoutName(display), "largest", false).layout);
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
      return smartPlan(windows, displays, (display, ids, layout) => fits(display, ids, layoutFor(layout, "largest")));
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
