import type { Tool } from "@raycast/api";
import { listWindows } from "../lib/raycast";
import { arrangePlan } from "../lib/tiles";

type Input = {
  /**
   * One entry per display to arrange. Windows left out of every entry stay on their display and are
   * tiled after the listed ones.
   */
  displays: {
    /** The display's `index` from get-windows. */
    display: number;
    /**
     * How to tile this display: "auto-tile" (an even grid), "master-left", "master-right" or
     * "master-center" (one main window with the rest stacked beside it). Defaults to the last layout used.
     */
    layout?: "auto-tile" | "master-left" | "master-right" | "master-center";
    /**
     * Window ids from get-windows, in order. In a master layout the first is the master. In auto-tile
     * they fill left to right, top row first.
     */
    windows: string[];
  }[];
};

/** Moves windows onto the displays given, in the order given, and tiles each display. */
export default async function tool(input: Input) {
  return arrangePlan(input.displays);
}

/**
 * Asks before any window is moved. Every open window is arranged, not only the ones the plan names:
 * the rest stay on their display and are tiled after them. So the confirmation counts them all.
 */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const plural = (n: number, word: string) => `${n} ${n === 1 ? word : word + "s"}`;
  const planned = input.displays.reduce((count, d) => count + d.windows.length, 0);
  // If the windows can't be read, the plan's own count is the best there is, and the tool will say why
  const open = await listWindows().catch(() => undefined);
  const windows = open ? open.windows.length : planned;
  const displays = open ? open.displays.length : input.displays.length;
  return {
    message: `Move and resize all ${plural(windows, "open window")} across ${plural(displays, "display")}?`,
    info: [
      ...input.displays.map((d) => ({
        name: `Display ${d.display + 1}`,
        value: `${plural(d.windows.length, "window")} placed in order, ${d.layout ?? "current layout"}`,
      })),
      ...(windows > planned
        ? [{ name: "Other windows", value: `${plural(windows - planned, "window")} tiled after those` }]
        : []),
    ],
  };
};
