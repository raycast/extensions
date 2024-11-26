import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast } from "@raycast/api";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { useEffect, useState } from "react";

const execAsync = promisify(exec);

interface ChromeProfile {
  name: string;
}

export default function Command() {
  const [profiles, setProfiles] = useState<ChromeProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      const script = `
        tell application "System Events"
          tell process "Google Chrome"
            return name of every menu item of menu 1 of menu bar item "Profiles" of menu bar 1
          end tell
        end tell
      `;
      const { stdout } = await execAsync(`osascript -e '${script}'`);

      // Parse the profile names from the output
      const profileNames = stdout
        .split(",")
        .map((name) => name.trim())
        .filter((name) => name !== "Edit…" && name !== "" && name !== "missing value" && name !== "Add Profile…"); // Filter out the "Edit..." menu item

      console.log("Found profiles:", profileNames); // Debug log

      if (profileNames.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Chrome profiles found",
        });
        return;
      }

      setProfiles(profileNames.map((name) => ({ name })));
    } catch (error) {
      console.error("Error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load Chrome profiles",
        message: "Make sure Chrome is running",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function switchProfile(profileName: string) {
    try {
      const script = `
        tell application "Google Chrome"
          activate
        end tell
        
        tell application "System Events"
          tell process "Google Chrome"
            click menu item "${profileName}" of menu 1 of menu bar item "Profiles" of menu bar 1
          end tell
        end tell
      `;
      await execAsync(`osascript -e '${script}'`);
      closeMainWindow();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch profile",
      });
    }
  }

  return (
    <List isLoading={isLoading}>
      {profiles.map((profile) => (
        <List.Item
          key={profile.name}
          icon={Icon.Person}
          title={profile.name}
          actions={
            <ActionPanel>
              <Action title="Switch to Profile" onAction={() => switchProfile(profile.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
