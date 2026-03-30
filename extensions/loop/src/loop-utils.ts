import { LocalStorage, Toast, open, showToast } from "@raycast/api";

export type LoopAction = {
  id: string;
  title: string;
  category: string;
  url: string;
  aliases: string[];
  description: string;
};

const RECENTS_KEY = "recent-action-ids";
const MAX_RECENTS = 8;

export const FAVORITES_KEY = "favorite-action-ids";

export const ACTIONS: LoopAction[] = [
  {
    id: "maximize",
    title: "Maximize",
    category: "General",
    url: "loop://action/maximize",
    aliases: ["fullscreen", "fill screen", "full"],
    description: "Expand the frontmost window to fill the screen.",
  },
  {
    id: "almostmaximize",
    title: "Almost Maximize",
    category: "General",
    url: "loop://action/almostmaximize",
    aliases: ["almost full", "padded maximize"],
    description: "Maximize the window while preserving comfortable outer padding.",
  },
  {
    id: "maximizeheight",
    title: "Maximize Height",
    category: "General",
    url: "loop://action/maximizeheight",
    aliases: ["tall", "full height"],
    description: "Stretch the window vertically without changing its width.",
  },
  {
    id: "maximizewidth",
    title: "Maximize Width",
    category: "General",
    url: "loop://action/maximizewidth",
    aliases: ["wide", "full width"],
    description: "Stretch the window horizontally without changing its height.",
  },
  {
    id: "fillavailablespace",
    title: "Fill Available Space",
    category: "General",
    url: "loop://action/fillavailablespace",
    aliases: ["available space", "smart maximize"],
    description: "Resize the window to fill the currently available space.",
  },
  {
    id: "center",
    title: "Center",
    category: "General",
    url: "loop://action/center",
    aliases: ["centre", "middle"],
    description: "Center the current window on screen.",
  },
  {
    id: "macoscenter",
    title: "macOS Center",
    category: "General",
    url: "loop://action/macoscenter",
    aliases: ["apple center", "ergonomic center"],
    description: "Center the window using Loop's macOS-style vertical offset.",
  },
  {
    id: "fullscreen",
    title: "Fullscreen",
    category: "General",
    url: "loop://action/fullscreen",
    aliases: ["native fullscreen"],
    description: "Send the window to fullscreen.",
  },
  {
    id: "hide",
    title: "Hide",
    category: "General",
    url: "loop://action/hide",
    aliases: ["conceal"],
    description: "Hide the frontmost app window.",
  },
  {
    id: "minimize",
    title: "Minimize",
    category: "General",
    url: "loop://action/minimize",
    aliases: ["dock"],
    description: "Minimize the frontmost window.",
  },
  {
    id: "minimizeothers",
    title: "Minimize Others",
    category: "General",
    url: "loop://action/minimizeothers",
    aliases: ["focus mode", "clear clutter"],
    description: "Minimize the other windows around your current one.",
  },
  {
    id: "lefthalf",
    title: "Left Half",
    category: "Halves",
    url: "loop://action/lefthalf",
    aliases: ["left", "half left"],
    description: "Move the window to the left half of the screen.",
  },
  {
    id: "righthalf",
    title: "Right Half",
    category: "Halves",
    url: "loop://action/righthalf",
    aliases: ["right", "half right"],
    description: "Move the window to the right half of the screen.",
  },
  {
    id: "tophalf",
    title: "Top Half",
    category: "Halves",
    url: "loop://action/tophalf",
    aliases: ["top", "upper half"],
    description: "Move the window to the top half of the screen.",
  },
  {
    id: "bottomhalf",
    title: "Bottom Half",
    category: "Halves",
    url: "loop://action/bottomhalf",
    aliases: ["bottom", "lower half"],
    description: "Move the window to the bottom half of the screen.",
  },
  {
    id: "horizontalcenterhalf",
    title: "Horizontal Center Half",
    category: "Halves",
    url: "loop://action/horizontalcenterhalf",
    aliases: ["middle half", "centered half"],
    description: "Use the middle half of the screen horizontally.",
  },
  {
    id: "verticalcenterhalf",
    title: "Vertical Center Half",
    category: "Halves",
    url: "loop://action/verticalcenterhalf",
    aliases: ["middle strip", "center band"],
    description: "Use the middle half of the screen vertically.",
  },
  {
    id: "topleftquarter",
    title: "Top Left Quarter",
    category: "Quarters",
    url: "loop://action/topleftquarter",
    aliases: ["top left", "quarter tl"],
    description: "Snap the window into the top-left quarter.",
  },
  {
    id: "toprightquarter",
    title: "Top Right Quarter",
    category: "Quarters",
    url: "loop://action/toprightquarter",
    aliases: ["top right", "quarter tr"],
    description: "Snap the window into the top-right quarter.",
  },
  {
    id: "bottomleftquarter",
    title: "Bottom Left Quarter",
    category: "Quarters",
    url: "loop://action/bottomleftquarter",
    aliases: ["bottom left", "quarter bl"],
    description: "Snap the window into the bottom-left quarter.",
  },
  {
    id: "bottomrightquarter",
    title: "Bottom Right Quarter",
    category: "Quarters",
    url: "loop://action/bottomrightquarter",
    aliases: ["bottom right", "quarter br"],
    description: "Snap the window into the bottom-right quarter.",
  },
  {
    id: "leftthird",
    title: "Left Third",
    category: "Thirds",
    url: "loop://action/leftthird",
    aliases: ["third left", "narrow left"],
    description: "Move the window to the left third of the screen.",
  },
  {
    id: "lefttwothirds",
    title: "Left Two Thirds",
    category: "Thirds",
    url: "loop://action/lefttwothirds",
    aliases: ["wide left", "two thirds left"],
    description: "Move the window to the left two-thirds of the screen.",
  },
  {
    id: "horizontalcenterthird",
    title: "Horizontal Center Third",
    category: "Thirds",
    url: "loop://action/horizontalcenterthird",
    aliases: ["center third", "middle third"],
    description: "Place the window in the horizontal center third.",
  },
  {
    id: "righttwothirds",
    title: "Right Two Thirds",
    category: "Thirds",
    url: "loop://action/righttwothirds",
    aliases: ["wide right", "two thirds right"],
    description: "Move the window to the right two-thirds of the screen.",
  },
  {
    id: "rightthird",
    title: "Right Third",
    category: "Thirds",
    url: "loop://action/rightthird",
    aliases: ["third right", "narrow right"],
    description: "Move the window to the right third of the screen.",
  },
  {
    id: "topthird",
    title: "Top Third",
    category: "Thirds",
    url: "loop://action/topthird",
    aliases: ["upper third"],
    description: "Move the window to the top third of the screen.",
  },
  {
    id: "toptwothirds",
    title: "Top Two Thirds",
    category: "Thirds",
    url: "loop://action/toptwothirds",
    aliases: ["upper two thirds"],
    description: "Move the window to the top two-thirds of the screen.",
  },
  {
    id: "verticalcenterthird",
    title: "Vertical Center Third",
    category: "Thirds",
    url: "loop://action/verticalcenterthird",
    aliases: ["center vertical third"],
    description: "Place the window in the vertical center third.",
  },
  {
    id: "bottomtwothirds",
    title: "Bottom Two Thirds",
    category: "Thirds",
    url: "loop://action/bottomtwothirds",
    aliases: ["lower two thirds"],
    description: "Move the window to the bottom two-thirds of the screen.",
  },
  {
    id: "bottomthird",
    title: "Bottom Third",
    category: "Thirds",
    url: "loop://action/bottomthird",
    aliases: ["lower third"],
    description: "Move the window to the bottom third of the screen.",
  },
  {
    id: "firstfourth",
    title: "First Fourth",
    category: "Fourths",
    url: "loop://action/firstfourth",
    aliases: ["column 1", "first quarter strip"],
    description: "Place the window in the first vertical fourth.",
  },
  {
    id: "secondfourth",
    title: "Second Fourth",
    category: "Fourths",
    url: "loop://action/secondfourth",
    aliases: ["column 2", "second strip"],
    description: "Place the window in the second vertical fourth.",
  },
  {
    id: "thirdfourth",
    title: "Third Fourth",
    category: "Fourths",
    url: "loop://action/thirdfourth",
    aliases: ["column 3", "third strip"],
    description: "Place the window in the third vertical fourth.",
  },
  {
    id: "fourthfourth",
    title: "Fourth Fourth",
    category: "Fourths",
    url: "loop://action/fourthfourth",
    aliases: ["column 4", "fourth strip"],
    description: "Place the window in the fourth vertical fourth.",
  },
  {
    id: "leftthreefourths",
    title: "Left Three Fourths",
    category: "Fourths",
    url: "loop://action/leftthreefourths",
    aliases: ["three fourths left", "wide left"],
    description: "Resize the window to the left three-fourths of the screen.",
  },
  {
    id: "rightthreefourths",
    title: "Right Three Fourths",
    category: "Fourths",
    url: "loop://action/rightthreefourths",
    aliases: ["three fourths right", "wide right"],
    description: "Resize the window to the right three-fourths of the screen.",
  },
  {
    id: "nextscreen",
    title: "Next Screen",
    category: "Screens",
    url: "loop://action/nextscreen",
    aliases: ["next display", "monitor next"],
    description: "Move the window to the next display.",
  },
  {
    id: "previousscreen",
    title: "Previous Screen",
    category: "Screens",
    url: "loop://action/previousscreen",
    aliases: ["prev display", "monitor previous"],
    description: "Move the window to the previous display.",
  },
  {
    id: "leftscreen",
    title: "Left Screen",
    category: "Screens",
    url: "loop://action/leftscreen",
    aliases: ["display left"],
    description: "Move the window to the display on the left.",
  },
  {
    id: "rightscreen",
    title: "Right Screen",
    category: "Screens",
    url: "loop://action/rightscreen",
    aliases: ["display right"],
    description: "Move the window to the display on the right.",
  },
  {
    id: "topscreen",
    title: "Top Screen",
    category: "Screens",
    url: "loop://action/topscreen",
    aliases: ["display above"],
    description: "Move the window to the display above the current one.",
  },
  {
    id: "bottomscreen",
    title: "Bottom Screen",
    category: "Screens",
    url: "loop://action/bottomscreen",
    aliases: ["display below"],
    description: "Move the window to the display below the current one.",
  },
  {
    id: "larger",
    title: "Larger",
    category: "Sizing",
    url: "loop://action/larger",
    aliases: ["expand", "bigger"],
    description: "Increase the current window size.",
  },
  {
    id: "smaller",
    title: "Smaller",
    category: "Sizing",
    url: "loop://action/smaller",
    aliases: ["shrink overall", "reduce"],
    description: "Decrease the current window size.",
  },
  {
    id: "scaleup",
    title: "Larger (Proportional)",
    category: "Sizing",
    url: "loop://action/scaleup",
    aliases: ["proportional larger", "scale up"],
    description: "Scale the window up while preserving its proportions.",
  },
  {
    id: "scaledown",
    title: "Smaller (Proportional)",
    category: "Sizing",
    url: "loop://action/scaledown",
    aliases: ["proportional smaller", "scale down"],
    description: "Scale the window down while preserving its proportions.",
  },
  {
    id: "shrinktop",
    title: "Shrink Top",
    category: "Sizing",
    url: "loop://action/shrinktop",
    aliases: ["trim top"],
    description: "Shrink the window inward from the top edge.",
  },
  {
    id: "shrinkbottom",
    title: "Shrink Bottom",
    category: "Sizing",
    url: "loop://action/shrinkbottom",
    aliases: ["trim bottom"],
    description: "Shrink the window inward from the bottom edge.",
  },
  {
    id: "shrinkleft",
    title: "Shrink Left",
    category: "Sizing",
    url: "loop://action/shrinkleft",
    aliases: ["trim left"],
    description: "Shrink the window inward from the left edge.",
  },
  {
    id: "shrinkright",
    title: "Shrink Right",
    category: "Sizing",
    url: "loop://action/shrinkright",
    aliases: ["trim right"],
    description: "Shrink the window inward from the right edge.",
  },
  {
    id: "shrinkhorizontal",
    title: "Shrink Horizontally",
    category: "Sizing",
    url: "loop://action/shrinkhorizontal",
    aliases: ["shrink x"],
    description: "Shrink the window from both horizontal edges.",
  },
  {
    id: "shrinkvertical",
    title: "Shrink Vertically",
    category: "Sizing",
    url: "loop://action/shrinkvertical",
    aliases: ["shrink y"],
    description: "Shrink the window from both vertical edges.",
  },
  {
    id: "growtop",
    title: "Grow Top",
    category: "Sizing",
    url: "loop://action/growtop",
    aliases: ["expand top"],
    description: "Grow the window outward from the top edge.",
  },
  {
    id: "growbottom",
    title: "Grow Bottom",
    category: "Sizing",
    url: "loop://action/growbottom",
    aliases: ["expand bottom"],
    description: "Grow the window outward from the bottom edge.",
  },
  {
    id: "growleft",
    title: "Grow Left",
    category: "Sizing",
    url: "loop://action/growleft",
    aliases: ["expand left"],
    description: "Grow the window outward from the left edge.",
  },
  {
    id: "growright",
    title: "Grow Right",
    category: "Sizing",
    url: "loop://action/growright",
    aliases: ["expand right"],
    description: "Grow the window outward from the right edge.",
  },
  {
    id: "growhorizontal",
    title: "Grow Horizontally",
    category: "Sizing",
    url: "loop://action/growhorizontal",
    aliases: ["grow x"],
    description: "Grow the window from both horizontal edges.",
  },
  {
    id: "growvertical",
    title: "Grow Vertically",
    category: "Sizing",
    url: "loop://action/growvertical",
    aliases: ["grow y"],
    description: "Grow the window from both vertical edges.",
  },
  {
    id: "moveleft",
    title: "Move Left",
    category: "Move",
    url: "loop://action/moveleft",
    aliases: ["nudge left", "shift left"],
    description: "Nudge the current window to the left.",
  },
  {
    id: "moveright",
    title: "Move Right",
    category: "Move",
    url: "loop://action/moveright",
    aliases: ["nudge right", "shift right"],
    description: "Nudge the current window to the right.",
  },
  {
    id: "moveup",
    title: "Move Up",
    category: "Move",
    url: "loop://action/moveup",
    aliases: ["nudge up", "shift up"],
    description: "Nudge the current window upward.",
  },
  {
    id: "movedown",
    title: "Move Down",
    category: "Move",
    url: "loop://action/movedown",
    aliases: ["nudge down", "shift down"],
    description: "Nudge the current window downward.",
  },
  {
    id: "focusleft",
    title: "Focus Left",
    category: "Focus",
    url: "loop://action/focusleft",
    aliases: ["select left window"],
    description: "Focus the neighboring window to the left.",
  },
  {
    id: "focusright",
    title: "Focus Right",
    category: "Focus",
    url: "loop://action/focusright",
    aliases: ["select right window"],
    description: "Focus the neighboring window to the right.",
  },
  {
    id: "focusup",
    title: "Focus Up",
    category: "Focus",
    url: "loop://action/focusup",
    aliases: ["select upper window"],
    description: "Focus the neighboring window above.",
  },
  {
    id: "focusdown",
    title: "Focus Down",
    category: "Focus",
    url: "loop://action/focusdown",
    aliases: ["select lower window"],
    description: "Focus the neighboring window below.",
  },
  {
    id: "focusnextinstack",
    title: "Focus Next In Stack",
    category: "Focus",
    url: "loop://action/focusnextinstack",
    aliases: ["next stacked window"],
    description: "Cycle focus through windows stacked in the same area.",
  },
  {
    id: "undo",
    title: "Undo",
    category: "Other",
    url: "loop://action/undo",
    aliases: ["revert last action"],
    description: "Undo the previous Loop action.",
  },
  {
    id: "initialframe",
    title: "Initial Frame",
    category: "Other",
    url: "loop://action/initialframe",
    aliases: ["restore", "original size"],
    description: "Restore the window to its original frame.",
  },
  {
    id: "stash",
    title: "Stash",
    category: "Other",
    url: "loop://action/stash",
    aliases: ["hide at edge"],
    description: "Stash the current window at the edge of the screen.",
  },
  {
    id: "unstash",
    title: "Unstash",
    category: "Other",
    url: "loop://action/unstash",
    aliases: ["restore stash"],
    description: "Bring a stashed window back into view.",
  },
];

export const CATEGORY_ORDER = [
  "General",
  "Halves",
  "Quarters",
  "Thirds",
  "Fourths",
  "Screens",
  "Sizing",
  "Move",
  "Focus",
  "Other",
];

export const POPULAR_ACTION_IDS = [
  "lefthalf",
  "righthalf",
  "maximize",
  "center",
  "topleftquarter",
  "toprightquarter",
  "bottomleftquarter",
  "bottomrightquarter",
  "nextscreen",
  "undo",
];

export const QUICK_ACTIONS = ["lefthalf", "righthalf", "maximize", "center"] as const;

export async function readStoredIds(key: string) {
  const value = await LocalStorage.getItem<string>(key);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function writeStoredIds(key: string, value: string[]) {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

export async function runLoopAction(action: LoopAction) {
  try {
    await open(action.url);

    const recentIds = await readStoredIds(RECENTS_KEY);
    const nextRecentIds = [action.id, ...recentIds.filter((id) => id !== action.id)].slice(0, MAX_RECENTS);
    await writeStoredIds(RECENTS_KEY, nextRecentIds);

    await showToast({
      style: Toast.Style.Success,
      title: `Ran ${action.title}`,
      message: action.url,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't run Loop action",
      message: error instanceof Error ? error.message : "Make sure Loop is installed and its URL scheme is available.",
    });
  }
}

export async function runLoopKeybind(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  try {
    const url = `loop://keybind/${encodeURIComponent(trimmedName)}`;
    await open(url);

    await showToast({
      style: Toast.Style.Success,
      title: `Ran keybind "${trimmedName}"`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't run Loop keybind",
      message: error instanceof Error ? error.message : "Make sure Loop is installed and the keybind name is correct.",
    });
  }
}

export function getActionById(actionId: string) {
  return ACTIONS.find((action) => action.id === actionId);
}
