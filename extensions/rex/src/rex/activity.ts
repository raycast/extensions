import { getPreferenceValues, type List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { workingAccessory } from "./dots";
import { animates } from "./icons";
import { hasIndeterminateWorking, STATE_COLORS, workingProgress } from "./status";
import type { RexBlock } from "./types";

/** One shared frame cycle: 24 frames at Rex's 200 ms step covers the 6-frame dots, 3-frame pill dots, and 8-frame spinner. */
export const FRAME_CYCLE = 24;
export const FRAME_CYCLE_MS = 4800;

/** Row accessories for program activity that the preferences put at the row's edge rather than on the pill. */
export function activityAccessories(blocks: RexBlock[], frame: number): List.Item.Accessory[] {
  const { progressStyle, workingStyle } = getPreferenceValues<Preferences>();
  const out: List.Item.Accessory[] = [];
  const progress = workingProgress(blocks);
  if ((progressStyle === "accessory" || progressStyle === "both") && progress !== undefined) {
    out.push({
      icon: getProgressIcon(progress / 100, STATE_COLORS.working),
      text: `${progress}%`,
      tooltip: "Progress",
    });
  }
  if ((workingStyle === "trailing-animated" || workingStyle === "trailing-static") && hasIndeterminateWorking(blocks)) {
    out.push(workingAccessory(frame, workingStyle));
  }
  return out;
}

/** True when these blocks need an advancing frame counter for the chosen styles. */
export function needsFrames(blocks: RexBlock[]): boolean {
  const { workingStyle } = getPreferenceValues<Preferences>();
  return animates(blocks) || (workingStyle === "trailing-animated" && hasIndeterminateWorking(blocks));
}
