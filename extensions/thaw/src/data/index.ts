import { Icon } from "@raycast/api";

export type ThawActionSection = "actions" | "settings";

/** Host/path segment used in `thaw://<action>` URLs. */
export type ThawUrlAction =
  | "toggle-hidden"
  | "toggle-always-hidden"
  | "search"
  | "toggle-thawbar"
  | "toggle-application-menus"
  | "open-settings"
  | "authorize"
  | "toggle";

/** Direct-action command ids share the same literals as their URL hosts. */
type ThawDirectActionId = Exclude<ThawUrlAction, "authorize" | "toggle">;

export type ThawActionId =
  | ThawDirectActionId
  | "authorize-raycast"
  | "toggle-auto-rehide"
  | "toggle-show-on-hover"
  | "toggle-hide-application-menus";

export type ThawActionQuery = Readonly<Record<string, string>>;

export interface ThawAction {
  /** Matches the Raycast command `name` in package.json when a dedicated command exists. */
  readonly id: ThawActionId;
  readonly action: ThawUrlAction;
  readonly title: string;
  readonly subtitle: string;
  readonly query?: ThawActionQuery;
  readonly successMessage: string;
  readonly section: ThawActionSection;
  readonly icon: Icon;
  /** True for thaw://authorize and toggle?key= — needs Automation Settings URI + whitelist. */
  readonly requiresSettingsURI?: boolean;
}

const DIRECT_ACTIONS = [
  {
    id: "toggle-hidden",
    action: "toggle-hidden",
    title: "Toggle Hidden",
    subtitle: "Show or hide the hidden menu bar section",
    successMessage: "Toggled Hidden Section",
    section: "actions",
    icon: Icon.EyeDisabled,
  },
  {
    id: "toggle-always-hidden",
    action: "toggle-always-hidden",
    title: "Toggle Always Hidden",
    subtitle: "Show or hide the always-hidden menu bar section",
    successMessage: "Toggled Always Hidden Section",
    section: "actions",
    icon: Icon.Eye,
  },
  {
    id: "search",
    action: "search",
    title: "Search Menu Bar Items",
    subtitle: "Open the menu bar item search panel",
    successMessage: "Opened Search Panel",
    section: "actions",
    icon: Icon.MagnifyingGlass,
  },
  {
    id: "toggle-thawbar",
    action: "toggle-thawbar",
    title: "Toggle ThawBar",
    subtitle: "Toggle the ThawBar on the active display",
    successMessage: "Toggled ThawBar",
    section: "actions",
    icon: Icon.BarChart,
  },
  {
    id: "toggle-application-menus",
    action: "toggle-application-menus",
    title: "Toggle Application Menus",
    subtitle: "Show or hide application menus",
    successMessage: "Toggled Application Menus",
    section: "actions",
    icon: Icon.AppWindowList,
  },
  {
    id: "open-settings",
    action: "open-settings",
    title: "Open Settings",
    subtitle: "Open the Thaw settings window",
    successMessage: "Opened Settings",
    section: "actions",
    icon: Icon.Gear,
  },
] as const satisfies ReadonlyArray<ThawAction>;

const SETTINGS_ACTIONS = [
  {
    id: "authorize-raycast",
    action: "authorize",
    title: "Authorize Raycast",
    subtitle: "Enable Settings URI Scheme first, then approve Raycast",
    successMessage: "Sent authorize request — enable Settings URI, then approve Raycast",
    section: "settings",
    icon: Icon.Key,
    requiresSettingsURI: true,
  },
  {
    id: "toggle-auto-rehide",
    action: "toggle",
    title: "Toggle Auto Rehide",
    subtitle: "Turn automatic hidden-section rehide on or off",
    query: { key: "autoRehide" },
    successMessage: "Sent Toggle Auto Rehide to Thaw — requires Settings URI",
    section: "settings",
    icon: Icon.Clock,
    requiresSettingsURI: true,
  },
  {
    id: "toggle-show-on-hover",
    action: "toggle",
    title: "Toggle Show on Hover",
    subtitle: "Turn hidden-section reveal on hover on or off",
    query: { key: "showOnHover" },
    successMessage: "Sent Toggle Show on Hover to Thaw — requires Settings URI",
    section: "settings",
    icon: Icon.Mouse,
    requiresSettingsURI: true,
  },
  {
    id: "toggle-hide-application-menus",
    action: "toggle",
    title: "Toggle Hide Application Menus",
    subtitle: "Turn application menu hiding on or off",
    query: { key: "hideApplicationMenus" },
    successMessage: "Sent Toggle Hide Application Menus to Thaw — requires Settings URI",
    section: "settings",
    icon: Icon.AppWindow,
    requiresSettingsURI: true,
  },
] as const satisfies ReadonlyArray<ThawAction>;

export const THAW_ACTIONS: readonly ThawAction[] = [...DIRECT_ACTIONS, ...SETTINGS_ACTIONS];

export const getThawAction = (id: ThawActionId): ThawAction => {
  const action = THAW_ACTIONS.find((candidate) => candidate.id === id);

  if (!action) {
    throw new Error(`Unknown Thaw action: ${id}`);
  }

  return action;
};

export const DIRECT_THAW_ACTIONS: readonly ThawAction[] = DIRECT_ACTIONS;
export const SETTINGS_THAW_ACTIONS: readonly ThawAction[] = SETTINGS_ACTIONS;
