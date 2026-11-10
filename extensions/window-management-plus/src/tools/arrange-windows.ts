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
