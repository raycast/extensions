export type ScreenLexActionId =
  | "capture-area"
  | "capture-window"
  | "capture-full-screen"
  | "translate-area"
  | "translate-window"
  | "translate-full-screen"
  | "open-library"
  | "open-recent"
  | "open-settings";

export type ScreenLexActionGroup = "capture" | "translate" | "open";
export type ScreenLexActionIcon =
  "area" | "window" | "screen" | "library" | "recent" | "settings";

export interface ScreenLexAction {
  id: ScreenLexActionId;
  title: string;
  subtitle: string;
  group: ScreenLexActionGroup;
  icon: ScreenLexActionIcon;
  keywords: string[];
  url: string;
}

export const screenLexActions: ScreenLexAction[] = [
  {
    id: "capture-area",
    title: "Capture Area",
    subtitle: "Select a region",
    group: "capture",
    icon: "area",
    keywords: ["screenshot", "region", "selection"],
    url: "screenlex-v1://capture/area",
  },
  {
    id: "capture-window",
    title: "Capture Window",
    subtitle: "Select a window",
    group: "capture",
    icon: "window",
    keywords: ["screenshot", "app", "window"],
    url: "screenlex-v1://capture/window",
  },
  {
    id: "capture-full-screen",
    title: "Capture Full Screen",
    subtitle: "Capture the current display",
    group: "capture",
    icon: "screen",
    keywords: ["screenshot", "display", "monitor"],
    url: "screenlex-v1://capture/full-screen",
  },
  {
    id: "translate-area",
    title: "Translate Area",
    subtitle: "Select a region and translate its text",
    group: "translate",
    icon: "area",
    keywords: ["ocr", "text", "region", "translation"],
    url: "screenlex-v1://translate/area",
  },
  {
    id: "translate-window",
    title: "Translate Window",
    subtitle: "Select a window and translate its text",
    group: "translate",
    icon: "window",
    keywords: ["ocr", "text", "window", "translation"],
    url: "screenlex-v1://translate/window",
  },
  {
    id: "translate-full-screen",
    title: "Translate Full Screen",
    subtitle: "Translate text on the current display",
    group: "translate",
    icon: "screen",
    keywords: ["ocr", "text", "display", "translation"],
    url: "screenlex-v1://translate/full-screen",
  },
  {
    id: "open-library",
    title: "Open ScreenLex",
    subtitle: "Open the main window",
    group: "open",
    icon: "library",
    keywords: ["history", "screenshots", "saved"],
    url: "screenlex-v1://open/library",
  },
  {
    id: "open-recent",
    title: "Open History",
    subtitle: "Show recent screenshots",
    group: "open",
    icon: "recent",
    keywords: ["history", "screenshots", "panel"],
    url: "screenlex-v1://open/recent",
  },
  {
    id: "open-settings",
    title: "Open Settings",
    subtitle: "Configure ScreenLex",
    group: "open",
    icon: "settings",
    keywords: ["preferences", "configuration", "hotkeys"],
    url: "screenlex-v1://open/settings",
  },
];

export function getScreenLexAction(id: ScreenLexActionId): ScreenLexAction {
  const action = screenLexActions.find((candidate) => candidate.id === id);

  if (!action) {
    throw new Error(`Unknown ScreenLex action: ${id}`);
  }

  return action;
}
