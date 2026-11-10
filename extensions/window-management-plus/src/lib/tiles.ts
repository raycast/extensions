// The tiling layouts by name. The last one used is remembered, so Rotate, Swap, Make Master Larger and
// Pivot rerun it instead of picking a layout of their own.

import { closeMainWindow } from "@raycast/api";
import type { Placed } from "./arrange";
import {
  MASTER_RATIO,
  leading,
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
  whereIs,
  type OnPlaced,
  swapDisplays,
  tile,
  type Panel,
} from "./raycast";
import { smartPlan } from "./roles";

const NAMES = ["auto-tile", "master-left", "master-right", "master-center"] as const;
/** A layout for the windows. The sidebar isn't one: it is pinned beside whichever layout is in use. */
export type TileName = (typeof NAMES)[number];
const isTileName = (value: unknown): value is TileName => NAMES.includes(value as TileName);
const isMaster = (name: TileName) => name.startsWith("master-");

/** The sidebar is as thin as its app allows: it is asked for this, then keeps the minimum its app insists on. */
const SIDEBAR_WIDTH = 200;
/** Auto Tile on its own puts up to three windows in a line and more in a grid. */
const AUTO_GRID_FROM = 4;
/** How far the sidebar can be from where it was put before that counts as having been dragged away. */
const DRAG = 12;

// Cache keys
const LAST = "last-tile";
const SIDEBAR = "sidebar"; // "on" while a sidebar is pinned
const PINNED = "sidebar-window"; // what is pinned: "notes", "ai", or a window made the sidebar, as JSON
const SIDEBAR_AT = "sidebar-at"; // where the sidebar was last put, to tell when it has been dragged away
const SPLIT = "split"; // "columns" when Pivot has turned Auto Tile on its side
const SHAPE = "shape"; // what Pivot chose: "line" or "grid". Unset, Auto Tile decides by window count.
const RATIO = "master-ratio";
const MASTERS = "masters"; // the window that is master on each display, so its size needn't say so
/** What `last-tile` held when the sidebar was a layout of its own. */
const OLD_SIDEBAR_LAYOUT = "auto-tile-sidebar";

/**
 * Everything remembered between commands. A command works out the state it wants, tiles with it, and
 * only saves it once windows have actually been arranged, so a command that fails changes nothing.
 */
type State = {
  /** The layout in use. */
  last: TileName;
  /** Whether a layout has been chosen yet. Until one is, Swap Displays leaves windows as they are. */
  hasTiled: boolean;
  /** Whether a sidebar is pinned, and what is: "notes", "ai", or a window as JSON. */
  sidebar: boolean;
  pinned: string;
  /** Auto Tile's shape, when Pivot has chosen one, and whether it is on its side. */
  shape?: "line" | "grid";
  sideways: boolean;
  /** The master's share of the width, and the windows that are masters. */
  ratio: number;
  masters: string[];
};

function read(): State {
  const last = cache.get(LAST);
  const shape = cache.get(SHAPE);
  return {
    last: isTileName(last) ? last : "auto-tile",
    hasTiled: isTileName(last) || last === OLD_SIDEBAR_LAYOUT,
    sidebar: cache.get(SIDEBAR) === "on" || (!cache.get(SIDEBAR) && last === OLD_SIDEBAR_LAYOUT),
    pinned: cache.get(PINNED) ?? "notes",
    shape: shape === "line" || shape === "grid" ? shape : undefined,
    sideways: cache.get(SPLIT) === "columns",
    ratio: Number(cache.get(RATIO)) || MASTER_RATIO,
    masters: JSON.parse(cache.get(MASTERS) ?? "[]"),
  };
}

/** Picks out the sidebar's window: by title for Raycast Notes or AI Chat, by id for one made the sidebar. */
function sidebarIs(pinned: string): (w: { id: string; title?: string }) => boolean {
  return isPanel(pinned) ? (w) => w.title === panelTitle(pinned) : (w) => w.id === madeSidebar(pinned).id;
}

/**
 * The state as it stands. Dragging the sidebar away unpins it, and nothing tells an extension when a
 * window moves, so this is where that is noticed: a sidebar that isn't where it was last put is an
 * ordinary window again. It is compared with where it was put, not with the edge of the screen, so
 * changing a gap setting isn't mistaken for a drag.
 */
async function current(): Promise<State> {
  const state = read();
  const put = JSON.parse(cache.get(SIDEBAR_AT) ?? "null") as { screen: number; right: number; y: number } | null;
  if (!state.sidebar || !put) return state;
  // If the windows can't be read, the command itself will say why
  const now = await whereIs(sidebarIs(state.pinned)).catch(() => undefined);
  if (!now) return state;
  const moved =
    now.screen !== put.screen ||
    Math.abs(now.frame.x + now.frame.width - put.right) > DRAG ||
    Math.abs(now.frame.y - put.y) > DRAG;
  // Unpinned for this command. It is saved with the rest once windows have been arranged.
  return moved ? { ...state, sidebar: false } : state;
}

type Built = {
  layout: Layout;
  pinned?: (i: Item) => boolean;
  /** The Raycast window pinned as the sidebar, if it is one. */
  panel?: Panel;
  /** Finds the sidebar's window. Resolves to a Raycast window's title, when that is what to find it by. */
  locate?: () => Promise<string | undefined>;
  /** The same, opening the window first if it isn't open. */
  open?: () => Promise<string | undefined>;
  /** Saves the state once windows have been arranged with it. */
  save: OnPlaced;
};

/**
 * The layout for a state, with the sidebar pinned beside it when one is on. When a display has more
 * windows than fit, the smallest share a slot. A master layout takes the focused window as its master
 * when `lead` is "focused", and otherwise keeps the masters it has.
 */
function build(state: State, lead: "focused" | "kept" = "kept"): Built {
  const tiled = plain(state, lead);
  // The ids the sidebar turns out to have, for remembering where it was put
  const sidebarIds = new Set<string>();
  const layout: Layout = (items, box, screen) => {
    for (const i of items) if (tiled.pinned?.(i)) sidebarIds.add(i.id);
    return stacking(tiled.layout, tiled.pinned)(items, box, screen);
  };
  return { ...tiled, layout, save: (placed) => save(state, placed, sidebarIds) };
}

/** The same without stacking, for checking what fits: stacking would hide a display that is too full. */
function plain(state: State, lead: "focused" | "kept" = "kept"): Omit<Built, "save"> {
  const layout = leading(layoutFor(state, lead), new Set(state.masters));
  return state.sidebar ? beside(layout, state) : { layout };
}

/** Saves a state that windows have been arranged with, and what that arrangement showed. */
function save(state: State, placed: Placed[], sidebarIds: Set<string>) {
  cache.set(LAST, state.last);
  cache.set(SIDEBAR, state.sidebar ? "on" : "off");
  cache.set(PINNED, state.pinned);
  cache.set(SPLIT, state.sideways ? "columns" : "rows");
  if (state.shape) cache.set(SHAPE, state.shape);
  cache.set(RATIO, String(state.ratio));
  // The masters as the layout just chose them. A display that wasn't arranged keeps the one it had.
  const arranged = new Set(placed.map((p) => p.id));
  const masters = [
    ...state.masters.filter((id) => !arranged.has(id)),
    ...placed.filter((p) => p.master).map((p) => p.id),
  ];
  cache.set(MASTERS, JSON.stringify(masters.slice(-20)));
  const side = state.sidebar && placed.find((p) => sidebarIds.has(p.id));
  if (side) {
    cache.set(
      SIDEBAR_AT,
      JSON.stringify({ screen: side.screen, right: side.frame.x + side.frame.width, y: side.frame.y }),
    );
  } else if (!state.sidebar) {
    cache.remove(SIDEBAR_AT);
  }
}

/** `layout` with the sidebar pinned down the right of it. */
function beside(layout: Layout, state: State): Omit<Built, "save"> {
  const { gap } = prefs();
  const what = state.pinned;
  const side = (pinned: (i: Item) => boolean) => sidebar(pinned, SIDEBAR_WIDTH, layout, gap);
  // Raycast Notes or AI Chat, found by title
  if (isPanel(what)) {
    const pinned = (i: Item) => i.title === panelTitle(what);
    const title = async () => panelTitle(what);
    return { layout: side(pinned), pinned, panel: what, locate: title, open: () => openPanel(what) };
  }
  // A window made the sidebar. If it has closed, another window of its app takes its place.
  const made = madeSidebar(what);
  const pinned = (i: Item) => i.id === made.id;
  const locate = async () => {
    const { windows } = await listWindows();
    const stand = !windows.some((w) => w.id === made.id) && made.app && windows.find((w) => w.bundleId === made.app);
    if (stand) {
      made.id = stand.id;
      // Saved with the rest of the state, once windows have been arranged
      state.pinned = JSON.stringify(made);
    }
    return undefined;
  };
  return { layout: side(pinned), pinned, locate };
}

/** The window Make Sidebar pinned. An older version stored only its id. */
function madeSidebar(stored: string): { id: string; app?: string } {
  try {
    const made = JSON.parse(stored);
    if (made && typeof made.id === "string") return made;
  } catch {
    // Not JSON: a bare window id
  }
  return { id: stored };
}

/** The layout on its own, without a sidebar or stacking. */
function layoutFor(state: State, lead: "focused" | "kept" = "kept", name = state.last): Layout {
  const { gap } = prefs();
  const from = lead === "focused" ? "focused" : undefined;
  switch (name) {
    case "auto-tile": {
      // A grid of two rows, or one line of windows. Asked for a grid, three windows are enough to make
      // one: two above and one below. Either can be turned on its side.
      const flat = state.shape === "line" ? rows(1, gap) : rows(2, gap, state.shape === "grid" ? 3 : AUTO_GRID_FROM);
      return state.sideways ? transposed(flat) : flat;
    }
    case "master-left":
      return master({ side: "left", ratio: state.ratio, gap, lead: from });
    case "master-right":
      return master({ side: "right", ratio: state.ratio, gap, lead: from });
    case "master-center":
      return master({ side: "center", ratio: state.ratio, gap, lead: from });
  }
}

/**
 * Tiles every window with a layout, and remembers it. Opens the sidebar's Raycast window if needed.
 * A master layout takes the focused window as its master. Rotate, Swap and Make Master Larger then keep
 * whichever window is master, wherever the focus goes.
 */
export async function runTile(name: TileName, done?: string) {
  const state = { ...(await current()), last: name, hasTiled: true };
  const { layout, open, locate, save } = build(state, "focused");
  return tile(layout, open ?? locate, false, done, save);
}

/**
 * Pins the sidebar, or lets it go, and tiles again in the layout already in use. While it is pinned,
 * every layout arranges the other windows beside it. It pins the Default Sidebar App, Raycast Notes or
 * AI Chat, opening it if needed.
 */
export async function toggleSidebar() {
  const was = await current();
  const on = !was.sidebar;
  const state = { ...was, sidebar: on, pinned: on ? prefs().sidebar : was.pinned };
  const { layout, open, locate, save } = build(state);
  return tile(layout, open ?? locate, false, on ? "Sidebar pinned" : "Sidebar unpinned", save);
}

/**
 * Makes the focused window the sidebar, whatever app it belongs to. It stays the sidebar until
 * Toggle Sidebar lets it go.
 */
export async function makeSidebar() {
  // Focus is on Raycast until its window closes
  await closeMainWindow();
  const focused = (await listWindows().catch(() => ({ windows: [] }))).windows.find((w) => w.focused);
  if (!focused) {
    return run(async () => {
      throw new Error("Click into the window you want as the sidebar, then run Make Sidebar again.");
    });
  }
  const pinned = JSON.stringify({ id: focused.id, app: focused.bundleId });
  const { layout, locate, save } = build({ ...(await current()), sidebar: true, pinned });
  return tile(layout, locate, false, `${focused.app} is the sidebar`, save);
}

/** The sides Cycle Master Layout steps through, with what to call each. */
const MASTER_CYCLE: [TileName, string][] = [
  ["master-left", "Master Left"],
  ["master-right", "Master Right"],
  ["master-center", "Master Center"],
];

/** Tiles with the master on the next side round, and says which. Hyprland's orientationnext. */
export function cycleMaster() {
  // From any other layout it starts on the left
  const at = MASTER_CYCLE.findIndex(([name]) => name === read().last);
  const [name, title] = MASTER_CYCLE[(at + 1) % MASTER_CYCLE.length];
  return runTile(name, title);
}

/**
 * Tiles again in the layout in use, on the display with the focused window only. `change` alters the
 * layout, and `next` the state. The sidebar stays pinned, and the master stays the master.
 */
async function retile(
  change: (layout: Layout, pinned?: (i: Item) => boolean) => Layout = (layout) => layout,
  next: (state: State) => State = (state) => state,
) {
  const { layout, pinned, locate, save } = build(next(await current()));
  return tile(change(layout, pinned), locate, true, "Arranged", save);
}

/** Every window one slot clockwise (1) or counterclockwise (-1). Hyprland's rollnext and rollprev. */
export const rotateTile = (step: 1 | -1) => retile((layout, pinned) => rotated(layout, step, pinned));

/** The active window trades places with the next one round. Hyprland's swapnext. */
export const swapNext = () => retile((layout, pinned) => swappedNext(layout, pinned));

/** The active window trades places with the master. Hyprland's swapwithmaster. */
export const swapWithMaster = () => retile((layout, pinned) => withMaster(layout, pinned));

/** The master takes a bigger or smaller share. Hyprland's mfact. Switches to Master Left if needed. */
export const resizeMaster = (delta: number) =>
  retile(undefined, (state) => ({
    ...state,
    ratio: Math.min(0.85, Math.max(0.15, Math.round((state.ratio + delta) * 100) / 100)),
    last: isMaster(state.last) ? state.last : "master-left",
    hasTiled: true,
  }));

/**
 * Auto Tile turns to its next shape, on the active display: side by side, then a grid of two rows, then
 * that grid on its side. It starts from what is showing now, so the first press always changes something.
 */
export async function pivot() {
  // Without the window count, Auto Tile's own choice can't be told, so a line is assumed.
  // The retile reports the reason if windows can't be read at all.
  const { windows } = await listWindows().catch(() => ({ windows: [] }));
  const display = windows.find((w) => w.focused)?.display ?? 0;
  const count = windows.filter((w) => w.display === display).length;
  return retile(undefined, (state) => {
    const showsGrid = state.shape === "grid" || (state.shape !== "line" && count >= AUTO_GRID_FROM);
    const to = nextPivot({ shape: showsGrid ? "grid" : "line", sideways: state.sideways }, count);
    return { ...state, shape: to.shape, sideways: to.sideways, last: "auto-tile", hasTiled: true };
  });
}

/**
 * Every window moves to the next display. If a layout has been chosen, they land in it, so they fit the
 * new screen. Otherwise each keeps its place and size relative to the screen.
 */
export async function swapDisplaysTile() {
  const state = await current();
  if (!state.hasTiled) return swapDisplays();
  const { layout, panel, save } = build(state);
  return swapDisplays({ layout, include: panel && panelTitle(panel), onPlaced: save });
}

/** Spreads every window over every display, then tiles each with the layout in use. */
export async function distributeTile() {
  const state = await current();
  const { layout, panel, save } = build(state);
  // What fits is checked with the sidebar in place, since it takes room too
  return distributeDisplays({ layout, include: panel && panelTitle(panel), onPlaced: save }, plain(state).layout);
}

/**
 * Arranges windows the way a plan says: which display each is on, in what order, in which layout.
 * The first window listed for a master layout is the master. Resolves to what happened, to relay.
 */
export async function arrangePlan(plan: { display: number; layout?: string; windows: string[] }[]) {
  const was = await current();
  const nameFor = (display: number): TileName => {
    const asked = plan.find((p) => p.display === display)?.layout;
    return isTileName(asked) ? asked : was.last;
  };
  // A plan says where every window goes, so no sidebar is pinned and the masters are the ones it names
  const state: State = {
    ...was,
    sidebar: false,
    masters: [],
    last: plan[0] ? nameFor(plan[0].display) : was.last,
    hasTiled: true,
  };
  const built = new Map<number, Built>();
  const on = (display: number) => {
    if (!built.has(display)) built.set(display, build({ ...state, last: nameFor(display) }));
    return built.get(display)!;
  };
  const placed = new Map(plan.flatMap((p) => p.windows.map((id, rank) => [id, { display: p.display, rank }] as const)));
  return placeWindows(
    placed,
    (display) => on(display).layout,
    (windows) => build(state).save(windows),
  );
}

/**
 * Arranges everything by what each app is for: the focused window leads the largest display with the rest
 * of the work beside it, and chat, mail and music go to the other displays.
 */
export const smartArrange = () =>
  run(async () => {
    const planNow = async () => {
      const { displays, windows, fits } = await listWindows();
      const state = { ...read(), sidebar: false, masters: [] };
      // Checked against the plain layout: stacking would hide a display that is too full
      return smartPlan(windows, displays, (display, ids, layout) =>
        fits(display, ids, layoutFor(state, "kept", layout)),
      );
    };
    const plan = await planNow();
    const result = await arrangePlan(plan);
    // Arranging can reveal that two apps are too big to share a display. Knowing that, the plan may
    // change, so it is worked out once more and applied if it has.
    const again = await planNow();
    return JSON.stringify(again) === JSON.stringify(plan) ? result : arrangePlan(again);
  });

/** The focused window keeps its display. The others there move to the next display, in the layout in use. */
export async function moveOthersTile() {
  const { layout, panel, save } = build(await current());
  return moveOthers({ layout, include: panel && panelTitle(panel), onPlaced: save });
}

/** Every window on the other displays comes to the focused window's display, in the layout in use. */
export async function moveAllTile() {
  const { layout, panel, save } = build(await current());
  return moveAll({ layout, include: panel && panelTitle(panel), onPlaced: save });
}
