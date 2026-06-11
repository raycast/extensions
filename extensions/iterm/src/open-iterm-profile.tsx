import { Action, ActionPanel, Icon, List, closeMainWindow, popToRoot, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getItermProfiles, ItermProfile } from "./core/get-iterm-profiles";
import { isPermissionError, PermissionErrorScreen } from "./core/permission-error-screen";

function createScriptForProfile(profileName: string, location: "window" | "tab" | "split-h" | "split-v"): string {
  const escapedName = profileName.replace(/"/g, '\\"');

  if (location === "window") {
    return `
      tell application "iTerm"
        launch
        repeat until application "iTerm" is running
          delay 0.1
        end repeat
        create window with profile "${escapedName}"
        activate
      end tell
    `;
  }

  if (location === "tab") {
    return `
      tell application "iTerm"
        launch
        repeat until application "iTerm" is running
          delay 0.1
        end repeat
        if windows of application "iTerm" is {} then
          create window with profile "${escapedName}"
        else
          tell current window
            create tab with profile "${escapedName}"
          end tell
        end if
        activate
      end tell
    `;
  }

  const direction = location === "split-h" ? "horizontally" : "vertically";
  return `
    on isAppRunning(appName)
      tell application "System Events" to (name of processes) contains appName
    end isAppRunning

    if isAppRunning("iTerm2") or isAppRunning("iTerm") then
      tell application "iTerm"
        activate
        tell current session of current window
          split ${direction} with profile "${escapedName}"
        end tell
      end tell
      return "true"
    else
      return "iTerm is not running"
    end if
  `;
}

export default function Command() {
  const [profiles, setProfiles] = useState<ItermProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermissionError, setHasPermissionError] = useState(false);

  useEffect(() => {
    const loadedProfiles = getItermProfiles();
    setProfiles(loadedProfiles);
    setIsLoading(false);
  }, []);

  const openProfile = async (profile: ItermProfile, location: "window" | "tab" | "split-h" | "split-v") => {
    try {
      const script = createScriptForProfile(profile.name, location);
      await runAppleScript(script);
      await closeMainWindow();
      await popToRoot();
    } catch (e) {
      const error = e as Error;
      if (isPermissionError(error.message)) {
        setHasPermissionError(true);
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: `Cannot open profile "${profile.name}"`,
        message: error.message,
      });
    }
  };

  if (hasPermissionError) {
    return <PermissionErrorScreen />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search iTerm profiles...">
      {profiles.map((profile) => (
        <List.Item
          key={profile.guid}
          icon={Icon.Terminal}
          title={profile.name}
          actions={
            <ActionPanel>
              <Action title="Open in New Tab" icon={Icon.Plus} onAction={() => openProfile(profile, "tab")} />
              <Action title="Open in New Window" icon={Icon.Window} onAction={() => openProfile(profile, "window")} />
              <ActionPanel.Section title="Split Pane">
                <Action
                  title="Open in Horizontal Split"
                  icon={Icon.AppWindowSidebarRight}
                  onAction={() => openProfile(profile, "split-h")}
                />
                <Action
                  title="Open in Vertical Split"
                  icon={Icon.AppWindowSidebarLeft}
                  onAction={() => openProfile(profile, "split-v")}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && profiles.length === 0 && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No profiles found"
          description="Could not find any iTerm profiles. Make sure iTerm2 is installed."
        />
      )}
    </List>
  );
}
