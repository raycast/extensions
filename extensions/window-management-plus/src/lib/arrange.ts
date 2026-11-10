// Runs a layout against a window system. No Raycast in here: the system is passed in, so tests use a fake.

import { carry, crowded, shares, type Frame, type Item, type Layout, type Placement, type Size } from "./layouts.ts";

/** A window that can be moved. `frame` is in the coordinates of the screen it is on. */
export type Win = Pick<Item, "id" | "frame" | "active" | "title"> & {
  screen: number;
  resizable: boolean;
  /** False when the window answers too unreliably for its size to be read as a limit. */
  learns?: boolean;
  /** What to call the window in a message, like its app's name. */
  name?: string;
  /** The window's own title, when macOS gives it. */
  label?: string;
  /** The app it belongs to. */
  bundleId?: string;
  appPath?: string;
};

/** Sizes an app insisted on: bigger than asked is a minimum, smaller a maximum. */
export type Limits = {
  min?: Partial<Size>;
  max?: Partial<Size>;
  /** When it was learned, in milliseconds. Limits expire, so one bad reading can't stick. */
  at?: number;
};

/** How long a learned limit is trusted. After that the window is asked again. */
export const LIMIT_TTL_MS = 10 * 60 * 1000;

/** Drops limits learned too long ago to trust. */
export function freshLimits(learned: Map<string, Limits>, now = Date.now()): Map<string, Limits> {
  return new Map([...learned].filter(([, l]) => l.at !== undefined && now - l.at < LIMIT_TTL_MS));
}

/** The most of a screen's width or height that a learned minimum can claim. */
const MAX_MINIMUM = 0.75;

/** How long a slow app gets to finish resizing before its size is taken as a limit. */
const SLOW_APP_MS = 300;

/** A window that could not be moved, with a name to show the user. */
export type Failure = { id: string; name: string };

export type System = {
  /** The usable area of each screen, in that screen's own coordinates. */
  areas(): Promise<Frame[]>;
  /** Where each screen's coordinates start, in coordinates shared by all screens. Only needed to compare screens. */
  origins?(): Promise<{ x: number; y: number }[]>;
  /** Every window worth arranging. `screen` indexes into `areas()`. */
  windows(): Promise<Win[]>;
  /** Moves windows. An app may refuse the size it was asked for. Resolves to the windows that could not be moved. */
  place(placements: Placement[]): Promise<Failure[]>;
};

/**
 * Lays out each screen's windows and applies the result. A window that comes back a different size
 * than asked keeps that size, and the layout runs again, up to `passes` times.
 * Every pass lays out the frames read before the first move, so choices like "the largest window"
 * don't change between passes. Layouts that build on the current frames, like swap, must run with one pass.
 * On a retry, windows that already sit where the layout wants them aren't touched, so only the ones
 * that have to make room move again.
 * `learned` holds the minimum and maximum sizes apps insisted on. Pass in what earlier runs learned and a
 * run can finish in one pass. It is updated in place. A limit is dropped once its window is seen past it.
 * With `activeOnly`, only the screen holding the active window is laid out.
 * Returns how many windows there were to arrange, and which of them could not be moved on the last pass.
 */
export async function arrange(
  system: System,
  layout: Layout,
  passes = 3,
  learned = new Map<string, Limits>(),
  activeOnly = false,
): Promise<{ count: number; failed: Failure[]; passes: number }> {
  const areas = await system.areas();
  const all = await system.windows();
  // Rearranging commands, like Hyprland's, only touch the display you're working on
  const only = activeOnly ? all.find((w) => w.active)?.screen : undefined;
  const first = only === undefined ? all : all.filter((w) => w.screen === only);
  forgetWrongLimits(learned, first);
  let windows = first;
  let failed: Failure[] = [];
  // Windows already where the layout wants them are left alone, so running a layout twice moves nothing
  let current = new Map(first.map((w) => [w.id, w.frame]));
  let pass = 1;

  for (; windows.length; pass++) {
    const placements = areas.flatMap((area, k) => {
      const items = windows.filter((w) => w.screen === k).map((w) => toItem(w, learned.get(w.id)));
      return items.length ? layout(items, area) : [];
    });
    const moves = placements.filter(({ id, frame }) => {
      const now = current.get(id);
      return !now || !near(now, frame);
    });
    failed = moves.length ? await system.place(moves) : [];
    if (pass >= passes) break;

    // Compare what we asked for with what each app did
    let after = await settled(system);
    // A window that came back the wrong size may just be slow, like one that changed display. Ask once
    // more before believing it, or a slow window is remembered as a limit its app doesn't have.
    const off = moves.filter(({ id, frame }) => {
      const now = after.find((w) => w.id === id);
      return now?.resizable && !failed.some((f) => f.id === id) && !sameSize(now.frame, frame);
    });
    if (off.length) {
      await new Promise((r) => setTimeout(r, SLOW_APP_MS));
      await system.place(off);
      await new Promise((r) => setTimeout(r, SLOW_APP_MS));
      after = await settled(system);
    }
    let clamped = false;
    for (const { id, frame } of placements) {
      const now = after.find((w) => w.id === id);
      // A window that didn't move tells us nothing about its app's limits
      if (!now?.resizable || now.learns === false || failed.some((f) => f.id === id)) continue;
      // Bigger than asked means the app has a minimum, smaller a maximum. Frames are read once they settle,
      // so a window still mid-resize isn't mistaken for either.
      const limits = learned.get(id) ?? {};
      const min = { ...limits.min };
      const max = { ...limits.max };
      // No app needs most of a screen. A "minimum" that big is a window that hadn't resized yet, and
      // believing it would leave no room for anything else.
      const area = areas[now.screen] ?? now.frame;
      const fits = { width: area.width * MAX_MINIMUM, height: area.height * MAX_MINIMUM };
      if (now.frame.width - frame.width > 2 && now.frame.width <= fits.width) min.width = now.frame.width;
      if (frame.width - now.frame.width > 2) max.width = now.frame.width;
      if (now.frame.height - frame.height > 2 && now.frame.height <= fits.height) min.height = now.frame.height;
      if (frame.height - now.frame.height > 2) max.height = now.frame.height;
      if (changed(limits.min, min) || changed(limits.max, max)) {
        learned.set(id, { min, max, at: Date.now() });
        clamped = true;
      }
    }
    if (!clamped) break;
    current = new Map(after.map((w) => [w.id, w.frame]));
    // Windows closed since the first read drop out. The rest keep their original frames.
    windows = first.filter((w) => current.has(w.id));
  }
  if (windows.length) await keepOnScreen(system, areas, new Set(windows.map((w) => w.id)));
  return { count: windows.length, failed, passes: pass };
}

/**
 * No command leaves a window hanging over the edge of its screen, where it would show on the next one.
 * A window that came out bigger than it was asked to be is slid back inside. One too big for the
 * screen is lined up with its top-left corner.
 */
export async function keepOnScreen(system: System, areas: Frame[], ids: Set<string>): Promise<void> {
  const inside = (start: number, size: number, from: number, room: number) =>
    Math.max(from, Math.min(start, from + room - size));
  const back = (await system.windows()).flatMap((w) => {
    const area = areas[w.screen];
    if (!area || !ids.has(w.id)) return [];
    const x = inside(w.frame.x, w.frame.width, area.x, area.width);
    const y = inside(w.frame.y, w.frame.height, area.y, area.height);
    return Math.abs(x - w.frame.x) > 2 || Math.abs(y - w.frame.y) > 2
      ? [{ id: w.id, frame: { ...w.frame, x, y } }]
      : [];
  });
  if (back.length) await system.place(back);
}

/** Apps resize asynchronously. Read until two reads in a row agree, so a frame mid-resize isn't taken as final. */
const SETTLE_MS = 60;
async function settled(system: System): Promise<Win[]> {
  let last = await system.windows();
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, SETTLE_MS));
    const now = await system.windows();
    const same =
      now.length === last.length &&
      now.every((w) => {
        const before = last.find((l) => l.id === w.id);
        return before && near(before.frame, w.frame);
      });
    last = now;
    if (same) break;
  }
  return last;
}

/** A window can't be smaller than its minimum or bigger than its maximum. If it is, that limit was wrong. */
function forgetWrongLimits(learned: Map<string, Limits>, windows: Win[]) {
  for (const w of windows) {
    const limits = learned.get(w.id);
    if (!limits) continue;
    const min = { ...limits.min };
    const max = { ...limits.max };
    for (const k of ["width", "height"] as const) {
      if (min[k] !== undefined && w.frame[k] < min[k] - 2) delete min[k];
      if (max[k] !== undefined && w.frame[k] > max[k] + 2) delete max[k];
    }
    learned.set(w.id, { ...limits, min, max });
  }
}

const changed = (a: Partial<Size> = {}, b: Partial<Size>) => a.width !== b.width || a.height !== b.height;

const sameSize = (a: Frame, b: Frame) => Math.abs(a.width - b.width) <= 2 && Math.abs(a.height - b.height) <= 2;

const near = (a: Frame, b: Frame) => (["x", "y", "width", "height"] as const).every((k) => Math.abs(a[k] - b[k]) <= 2);

export const toItem = ({ id, frame, active, title, resizable }: Win, limits?: Limits): Item => ({
  id,
  frame,
  active,
  title,
  fixed: resizable ? undefined : { width: frame.width, height: frame.height },
  min: limits?.min,
  max: limits?.max,
});

/**
 * Which display each window should be on to spread them over every display. Each display gets a share in
 * proportion to its size, then any display that still can't fit its windows passes some to a display
 * with room. As few windows move as possible, the active one never does, and the ones that move are those
 * already nearest the display they go to. Without `origins`, the smallest move.
 * `layout` is what each display will be tiled with, so "fit" means fit in that layout.
 */
export function assignDisplays(
  wins: Win[],
  areas: Frame[],
  layout: Layout,
  learned = new Map<string, Limits>(),
  origins?: { x: number; y: number }[],
): Map<string, number> {
  const on = new Map(wins.map((w) => [w.id, w.screen]));
  const movable = (w: Win) => !w.active;
  const smallestFirst = (a: Win, b: Win) => a.frame.width * a.frame.height - b.frame.width * b.frame.height;
  /** How far a window's centre is from the middle of a display. */
  const distance = (w: Win, to: number) => {
    if (!origins) return 0;
    const x = origins[w.screen].x + w.frame.x + w.frame.width / 2;
    const y = origins[w.screen].y + w.frame.y + w.frame.height / 2;
    return Math.hypot(
      x - (origins[to].x + areas[to].x + areas[to].width / 2),
      y - (origins[to].y + areas[to].y + areas[to].height / 2),
    );
  };
  const nearestTo = (to: number) => (a: Win, b: Win) => distance(a, to) - distance(b, to) || smallestFirst(a, b);
  const windowsOn = (k: number) => wins.filter((w) => on.get(w.id) === k);
  const fits = (k: number, ws: Win[]) =>
    !crowded(
      layout(
        ws.map((w) => ({ ...toItem(w, learned.get(w.id)), frame: carry(toItem(w), areas[w.screen], areas[k]) })),
        areas[k],
      ),
      areas[k],
    );

  // A fair share for each display, by size. Only a window the display can take alongside what it has
  // moves, and the nearest of those.
  const share = shares(wins.length, areas);
  const balance = () => {
    for (let guard = 0; guard < wins.length; guard++) {
      const spare = share.map((s, k) => s - windowsOn(k).length);
      const from = spare.reduce((worst, d, k, all) => (d < all[worst] ? k : worst), 0);
      const to = spare.reduce((best, d, k, all) => (d > all[best] ? k : best), 0);
      if (spare[from] >= 0 || spare[to] <= 0) break;
      const w = windowsOn(from)
        .filter(movable)
        .sort(nearestTo(to))
        .find((c) => fits(to, [...windowsOn(to), c]));
      if (!w) break;
      on.set(w.id, to);
    }
  };
  balance();

  // Then make sure each display can fit what it has, passing on a window whose leaving helps
  for (let guard = 0; guard < wins.length; guard++) {
    const from = areas.findIndex((_, k) => windowsOn(k).length > 1 && !fits(k, windowsOn(k)));
    if (from === -1) break;
    const other = areas.findIndex((_, k) => k !== from);
    const leaving = windowsOn(from).filter(movable).sort(nearestTo(other));
    const helps = (c: Win) =>
      fits(
        from,
        windowsOn(from).filter((w) => w !== c),
      );
    const w = leaving.find(helps) ?? leaving[0];
    const to = w && areas.findIndex((_, k) => k !== from && fits(k, [...windowsOn(k), w]));
    if (!w || to === undefined || to === -1) break;
    on.set(w.id, to);
  }
  // That can leave a display short again. Top it up with windows that do fit there.
  balance();
  return on;
}
