export interface ThawAction {
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export const THAW_ACTIONS: ThawAction[] = [
  {
    id: "toggle-hidden",
    title: "Toggle Hidden",
    subtitle: "Show or hide the hidden menu bar section",
    url: "thaw://toggle-hidden",
  },
  {
    id: "toggle-always-hidden",
    title: "Toggle Always Hidden",
    subtitle: "Show or hide the always-hidden menu bar section",
    url: "thaw://toggle-always-hidden",
  },
  {
    id: "search",
    title: "Search Menu Bar Items",
    subtitle: "Open the menu bar item search panel",
    url: "thaw://search",
  },
  {
    id: "toggle-thawbar",
    title: "Toggle ThawBar",
    subtitle: "Toggle the ThawBar on the active display",
    url: "thaw://toggle-thawbar",
  },
  {
    id: "toggle-application-menus",
    title: "Toggle Application Menus",
    subtitle: "Show or hide application menus",
    url: "thaw://toggle-application-menus",
  },
  {
    id: "open-settings",
    title: "Open Settings",
    subtitle: "Open the Thaw settings window",
    url: "thaw://open-settings",
  },
];
