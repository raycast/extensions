import { Color } from "@raycast/api";

export const TILE_COLORS_BY_INDEX = [
  // mapping Farrago's `colorIndex` (0-8) to Raycast's `Color`s
  Color.Purple,
  Color.Magenta,
  Color.Red,
  Color.Orange,
  Color.Yellow,
  Color.Green,
  Color.SecondaryText, // teal not available
  Color.Blue,
  Color.PrimaryText,
];

// Farrago's default fade duration is 2 seconds
// https://rogueamoeba.com/support/manuals/farrago/?page=inspector#:~:text=The%20Fade%20Out%20button%20will%20fade%20out%20playback%20over%202%20seconds.
export const FARRAGO_FADE_DURATION_MS = 2000;

export const ICLOUD_SHORTCUT_LINK = "https://www.icloud.com/shortcuts/80a4497d60214970954a04d6b13051f8";

export const DEFAULT_SHORTCUT_TITLE_TEMPLATE = "{{title}} {{icons}}";

export const FARRAGO_BUNDLE_ID = "com.rogueamoeba.farrago";

export const GET_FARRAGO_URL = "https://rogueamoeba.com/farrago/";

// todo: replace w/ github readme link
export const OSC_SETUP_INSTRUCTIONS_URL = "https://rogueamoeba.com/support/manuals/farrago/?page=osc";
