import { List, ActionPanel, Action, showToast, Toast, closeMainWindow, confirmAlert, Alert, Icon } from "@raycast/api";
import { HistoryEntry } from "./utils/history";
import { useProfiles } from "./hooks/useProfiles";
import { execDockutil } from "./utils/exec-dockutil";
import { ProfileDetail } from "./components/ProfileDetail";
import { removeFromHistory } from "./utils/history";

export default function Command() {
  const { profiles, isLoading, refresh } = useProfiles();

  const switchDockProfile = async (entry: HistoryEntry) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Switching dock",
        message: `Applying "${entry.profileName}"...`,
      });

      const currentOutput = execDockutil("--list");
      const currentItems = currentOutput
        .trim()
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line) => line.split("\t")[0].trim())
        .filter((name) => name !== "");

      // Remove all current items
      for (const item of currentItems) {
        execDockutil(`--remove "${item}"`, { stdio: "ignore" });
      }

      // Add items from the saved profile
      for (const item of entry.dockItems) {
        try {
          const itemPath = item.path.startsWith("file://")
            ? decodeURIComponent(item.path.replace("file://", ""))
            : item.path;

          execDockutil(`--add "${itemPath}"`, { stdio: "ignore" });
        } catch {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to add item",
            message: `Could not add "${item.name}"`,
          });
        }
      }

      await closeMainWindow();
      await showToast({
        style: Toast.Style.Success,
        title: "Dock switched",
        message: `"${entry.profileName}" applied with ${entry.dockItems.length} items`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to switch dock",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const deleteProfile = async (entry: HistoryEntry) => {
    const confirmed = await confirmAlert({
      title: "Delete Profile",
      message: `Are you sure you want to delete "${entry.profileName}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await removeFromHistory(entry.profileName);
      await refresh();
      await showToast({
        style: Toast.Style.Success,
        title: "Profile deleted",
        message: `"${entry.profileName}" has been deleted`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete profile",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles..." isShowingDetail>
      {profiles.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Profiles Found"
          description="Save a dock profile first using the 'Save Dock' command"
        />
      ) : (
        profiles.map((entry) => (
          <List.Item
            key={entry.profileName}
            title={entry.profileName}
            subtitle={`${entry.dockItems.length} items`}
            accessories={[{ text: new Date(entry.timestamp).toLocaleDateString() }]}
            detail={<ProfileDetail entry={entry} />}
            actions={
              <ActionPanel>
                <Action title="Switch to Profile" icon={Icon.Switch} onAction={() => switchDockProfile(entry)} />
                <Action
                  title="Delete Profile"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteProfile(entry)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
