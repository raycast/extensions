import { List, ActionPanel, Action, useNavigation } from "@raycast/api";
import { switchToApp, getAppIcon } from "./utils/appManager";
import { useApps } from "./hooks/useApps";
import { useHotkeys } from "./hooks/useHotkeys";
import { HotkeyAssignmentForm } from "./components/HotkeyAssignmentForm";

/**
 * Main command component for the Instant App Switcher
 */
export default function Command() {
  const { push } = useNavigation();

  // Load apps and manage search/filtering
  const { filteredApps, isLoading, error, searchText, setSearchText, trackAppUsage } = useApps();

  // Manage hotkey assignments
  const { hotkeysLoaded, assignHotkey, removeHotkey, getHotkeyForApp, getAppForHotkey } = useHotkeys();

  /**
   * Handle switching to an app (tracks usage and switches)
   */
  async function handleSwitchToApp(appName: string) {
    await trackAppUsage(appName);
    await switchToApp({ name: appName, windowTitle: "", isRunning: false });
  }

  /**
   * Handle search text changes (including hotkey detection)
   */
  function handleSearchTextChange(text: string) {
    // Check if this is a hotkey (no leading space)
    if (hotkeysLoaded && text.length > 0 && !text.startsWith(" ")) {
      const appName = getAppForHotkey(text);
      if (appName) {
        // Switch immediately without waiting for apps list
        handleSwitchToApp(appName);
        return;
      }
    }

    setSearchText(text);
  }

  // Show error state
  if (error) {
    return (
      <List>
        <List.Item title="Error" subtitle={error} icon="⚠️" />
      </List>
    );
  }

  // Render app list
  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Type hotkey or space + app name to search..."
    >
      {filteredApps.map((app) => {
        const hotkey = getHotkeyForApp(app.name);
        const appTitle = app.name;
        let subtitle = "";
        if (hotkey) {
          subtitle += `[${hotkey}] `;
        }
        if (app.isRunning) {
          subtitle += "Running";
        }

        return (
          <List.Item
            key={`${app.name}-${app.bundlePath || ""}`}
            title={appTitle}
            subtitle={subtitle}
            icon={getAppIcon(app)}
            actions={
              <ActionPanel>
                <Action title={app.isRunning ? "Switch" : "Launch"} onAction={() => handleSwitchToApp(app.name)} />
                <Action
                  title="Assign Hotkey"
                  onAction={() =>
                    push(<HotkeyAssignmentForm app={app} onAssign={(hotkey) => assignHotkey(app.name, hotkey)} />)
                  }
                  shortcut={{ modifiers: ["cmd"], key: "h" }}
                />
                {hotkey && (
                  <Action
                    title="Remove Hotkey"
                    onAction={() => removeHotkey(app.name, hotkey)}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
