import { ActionType } from "./types";

export const CLICK_TYPE_DISPLAY_NAME = {
  activate: "Activate",
  left: "Left Click",
  right: "Right Click",
  optLeft: "Option Left Click",
  optRight: "Option Right Click",
  show: "Show",
} as const satisfies Record<ActionType, string> & Record<Preferences.SearchMenuBarApps["primaryAction"], string>;

export const CLICK_TYPE_PAST_TENSE = {
  show: "Showed",
  activate: "Activated",
  left: "Left clicked",
  right: "Right clicked",
  optLeft: "Option left clicked",
  optRight: "Option right clicked",
} as const satisfies Record<ActionType, string> & Record<Preferences.SearchMenuBarApps["primaryAction"], string>;

export const ORDERED_CLICK_TYPES = Object.keys(CLICK_TYPE_DISPLAY_NAME) as Array<ActionType>;
