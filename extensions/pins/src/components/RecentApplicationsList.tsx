import { Action, ActionPanel, environment, getPreferenceValues, Icon, List, MenuBarExtra, open } from "@raycast/api";

import { getIcon } from "../lib/icons";
import { useRecentApplications } from "../lib/LocalData";
import { openPin } from "../lib/Pins";
import { ExtensionPreferences } from "../lib/preferences";
import OpenAllMenuItem from "./menu-items/OpenAllMenuItem";

/**
 * A list of recent applications as menu bar extra items (default) or list items (in the 'View Pins' command).
 * @param props.pinActions The actions to display for each pin. Only used in list view.
 * @returns A list of menu items or list items.
 */
export default function RecentApplicationsList(props: { pinActions?: JSX.Element }) {
  const { pinActions } = props;
  const { recentApplications, loadingRecentApplications } = useRecentApplications();
  const preferences = getPreferenceValues<ExtensionPreferences>();

  // Wrap each recent application in a pseudo-pin
  const pseudoPins = recentApplications.map((app) => ({
    name: app.name,
    url: app.path,
    group: "Recent Applications",
    id: -1,
    icon: "Favicon / File Icon",
    application: "None",
  }));

  if (preferences.showRecentApplications && (recentApplications.length > 1 || loadingRecentApplications)) {
    if (environment.commandName == "index") {
      // Show in menu bar
      return (
        <MenuBarExtra.Submenu title="Recent Applications" key="recent_apps" icon={Icon.Clock}>
          {pseudoPins.slice(1).map((pin) => {
            return (
              <MenuBarExtra.Item
                key={pin.url}
                icon={getIcon(pin.url)}
                title={pin.name.length > 20 ? pin.name.substring(0, 19) + "..." : pin.name}
                onAction={async () => await openPin(pin, preferences)}
              />
            );
          })}
          <OpenAllMenuItem pins={pseudoPins} submenuName="Recent Apps" />
        </MenuBarExtra.Submenu>
      );
    }

    // Show in 'view pins' command
    return (
      <List.Section title="Recent Applications">
        {recentApplications.slice(1).map((app) => (
          <List.Item
            title={app.name}
            subtitle="Recent Applications"
            key={app.name}
            icon={{ fileIcon: app.path }}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Pin Actions">
                  <Action title="Open" icon={Icon.ChevronRight} onAction={() => open(app.path)} />
                </ActionPanel.Section>
                {pinActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  }

  return null;
}
