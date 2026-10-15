import { usesCli } from "../lib/preferences";
import {
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  openCommandPreferences,
  openExtensionPreferences,
} from "@raycast/api";

const destinations = [
  { section: "organizations", title: "Organizations", icon: Icon.Building },
  { section: "repositories", title: "Watched Repositories", icon: Icon.Binoculars },
  { section: "teams", title: "Watched Teams", icon: Icon.TwoPeople },
  { section: "default-scope", title: "Default Filter Scope", icon: Icon.MagnifyingGlass },
  { section: "ignored-authors", title: "Ignored Authors", icon: Icon.EyeDisabled },
  { section: "saved-filters", title: "Saved Filters", icon: Icon.Bookmark },
  { section: "builtins", title: "Built-in Categories", icon: Icon.AppWindowGrid2x2 },
  { section: "notifications", title: "Notifications", icon: Icon.Bell },
];

/** Both menu layouts open the same configuration screens and saved settings. */
export function MenuSettings() {
  return (
    <MenuBarExtra.Submenu title="Configure Review Tracking" icon={Icon.Gear}>
      <MenuBarExtra.Item
        title={`Authentication Method: ${usesCli() ? "GitHub CLI" : "Personal Access Token"}`}
        icon={Icon.Key}
        onAction={openExtensionPreferences}
      />
      {destinations.map(({ section, title, icon }) => (
        <MenuBarExtra.Item
          key={section}
          title={title}
          icon={icon}
          onAction={() => launchCommand({ name: "settings", type: LaunchType.UserInitiated, context: { section } })}
        />
      ))}
      <MenuBarExtra.Item
        title="All Tracking Settings"
        icon={Icon.Gear}
        onAction={() => launchCommand({ name: "settings", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title="Menu Bar Layout and Preferences"
        icon={Icon.AppWindow}
        onAction={openCommandPreferences}
      />
    </MenuBarExtra.Submenu>
  );
}
