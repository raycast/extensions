import { Toast, showToast, List, ActionPanel, Action, Icon } from "@raycast/api";
import { getProfileNames, startFocusWithProfile, getActiveProfileName } from "./utils";
import { useState, useEffect } from "react";
import { ensureFocusIsRunning } from "./helpers";

export default function Command() {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProfiles() {
      if (!(await ensureFocusIsRunning())) {
        setIsLoading(false);
        return;
      }

      const fetchedProfiles = await getProfileNames();
      setProfiles(fetchedProfiles);
      setIsLoading(false);
    }

    fetchProfiles();
  }, []);

  async function handleProfileSelection(profileName: string) {
    if (!(await ensureFocusIsRunning())) {
      return;
    }

    const activeProfile = await getActiveProfileName();
    if (activeProfile) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Focus session already running",
        message: `Profile "${activeProfile}" is currently active`,
      });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Starting focus..." });
    await startFocusWithProfile(profileName);
    await showToast({ style: Toast.Style.Success, title: `Focus started with profile: ${profileName}` });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for a Profile">
      {profiles.length > 0 ? (
        profiles.map((profile) => (
          <List.Item
            key={profile}
            icon={Icon.Dot}
            title={`Start ${profile}`}
            actions={
              <ActionPanel>
                <Action title="Start" onAction={() => handleProfileSelection(profile)} />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.Item
          icon={Icon.Dot}
          title="No profiles found"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Focus Preferences" url="focus://preferences" />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
