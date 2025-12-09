import { Action, ActionPanel, Icon, List, closeMainWindow, popToRoot, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getItermProfiles, ItermProfile } from "./core/get-iterm-profiles";
import { isPermissionError, PermissionErrorScreen } from "./core/permission-error-screen";

function createScriptForProfile(profileName: string, location: "window" | "tab"): string {
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
  } else {
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

  const openProfile = async (profile: ItermProfile, location: "window" | "tab") => {
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
              <Action title="Open in New Window" icon={Icon.Window} onAction={() => openProfile(profile, "window")} />
              <Action title="Open in New Tab" icon={Icon.Plus} onAction={() => openProfile(profile, "tab")} />
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
