import { Toast, showToast, List, ActionPanel, Action, Icon } from "@raycast/api";
import { getInstallStatus, getProfileNames, startFocusWithProfile } from "./utils";
import { useState, useEffect } from "react";

export default function Command() {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProfiles() {
      if (!(await getInstallStatus())) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Focus is not installed",
          message: "Install Focus app from: https://heyfocus.com",
        });
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