// Runs a layout against a window system. No Raycast in here: the system is passed in, so tests use a fake.

import type { Frame, Item, Layout, Placement, Size } from "./layouts";

/** A window that can be moved. `frame` is in the coordinates of the screen it is on. */
export type Win = Pick<Item, "id" | "frame" | "active" | "title"> & {
  screen: number;
  resizable: boolean;
};

export type System = {
  /** The usable area of each screen, in that screen's own coordinates. */
  areas(): Promise<Frame[]>;
  /** Every window worth arranging. `screen` indexes into `areas()`. */
  windows(): Promise<Win[]>;
  /** Moves windows. An app may refuse the size it was asked for. */
  place(placements: Placement[]): Promise<void>;
};

/**
 * Lays out each screen's windows and applies the result. A window that comes back a different size
 * than asked keeps that size, and the layout runs again, up to `passes` times.
 * Layouts that build on the current frames, like rotate, must run with one pass.
 * Returns how many windows there were to arrange.
 */
export async function arrange(system: System, layout: Layout, passes = 3): Promise<number> {
  const areas = await system.areas();
  const learned = new Map<string, Partial<Size>>();
  let windows = await system.windows();

  for (let pass = 1; windows.length; pass++) {
    const placements = areas.flatMap((area, k) => {
      const items = windows.filter((w) => w.screen === k).map((w) => toItem(w, learned.get(w.id)));
      return items.length ? layout(items, area) : [];
    });
    await system.place(placements);
    if (pass >= passes) break;

    // Compare what we asked for with what each app did
    const after = await system.windows();
    let clamped = false;
    for (const { id, frame } of placements) {
      const now = after.find((w) => w.id === id);
      if (!now?.resizable) continue;
      // Bigger means a minimum, smaller means a maximum. Either way the app insists on that size.
      const old = learned.get(id);
      const size = { ...old };
      if (Math.abs(now.frame.width - frame.width) > 2) size.width = now.frame.width;
      if (Math.abs(now.frame.height - frame.height) > 2) size.height = now.frame.height;
      if (size.width !== old?.width || size.height !== old?.height) {
        learned.set(id, size);
        clamped = true;
      }
    }
    if (!clamped) break;
    windows = after;
  }
  return windows.length;
}

const toItem = ({ id, frame, active, title, resizable }: Win, min?: Partial<Size>): Item => ({
  id,
  frame,
  active,
  title,
  fixed: resizable ? undefined : { width: frame.width, height: frame.height },
  min,
});
