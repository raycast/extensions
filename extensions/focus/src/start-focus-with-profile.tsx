import { Toast, showToast, showHUD, List, ActionPanel, Action, Icon, closeMainWindow } from "@raycast/api";
import { getProfileNames, startFocusWithProfile, getActiveProfileName, openPreferences } from "./utils";
import { useCachedPromise } from "@raycast/utils";
import { ensureFocusIsRunning } from "./helpers";

export default function Command() {
  const { data: profiles = [], isLoading } = useCachedPromise(getProfileNames);

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

    await startFocusWithProfile(profileName);
    await showHUD(`Focus started with profile: ${profileName}`);
    await closeMainWindow();
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
              <Action title="Open Focus Preferences" onAction={openPreferences} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
