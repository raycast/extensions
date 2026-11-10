import type { Tool } from "@raycast/api";
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

/** Asks before any window is moved, saying how many windows and displays the plan covers. */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const windows = input.displays.reduce((count, d) => count + d.windows.length, 0);
  const displays = input.displays.length;
  return {
    message: `Move and resize ${windows} ${windows === 1 ? "window" : "windows"} across ${displays} ${displays === 1 ? "display" : "displays"}?`,
    info: input.displays.map((d) => ({
      name: `Display ${d.display + 1}`,
      value: `${d.windows.length} ${d.windows.length === 1 ? "window" : "windows"}, ${d.layout ?? "current layout"}`,
    })),
  };
};
