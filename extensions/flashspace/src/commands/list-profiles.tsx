import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getErrorMessage, getFlashspacePath, parseLines, runFlashspaceAsync } from "../utils/cli";

export default function ListProfiles() {
  const flashspace = getFlashspacePath();

  const { isLoading, data, revalidate } = useExec(flashspace, ["list-profiles"], {
    parseOutput: ({ stdout }) => parseLines(stdout),
    failureToastOptions: { title: "Failed to list profiles" },
  });

  const { data: activeProfile, revalidate: revalidateActiveProfile } = useExec(flashspace, ["get-profile"], {
    parseOutput: ({ stdout }) => stdout.trim(),
    failureToastOptions: { title: "Failed to get active profile" },
  });
  const [displayedActiveProfile, setDisplayedActiveProfile] = useState<string>();

  useEffect(() => {
    setDisplayedActiveProfile(activeProfile);
  }, [activeProfile]);

  async function handleDeleteProfile(profile: string) {
    const confirmed = await confirmAlert({
      title: "Delete Profile",
      message: `Are you sure you want to delete "${profile}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting profile..." });

    try {
      await runFlashspaceAsync(["delete-profile", profile]);
      toast.style = Toast.Style.Success;
      toast.title = `Profile "${profile}" deleted`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to delete profile";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles...">
      {data?.map((profile) => (
        <List.Item
          key={profile}
          title={profile}
          icon={displayedActiveProfile === profile ? Icon.CheckCircle : Icon.Circle}
          accessories={displayedActiveProfile === profile ? [{ tag: "Active" }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Activate Profile"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  const toast = await showToast({ style: Toast.Style.Animated, title: "Activating profile..." });
                  try {
                    await runFlashspaceAsync(["profile", profile]);
                    toast.style = Toast.Style.Success;
                    toast.title = `Profile "${profile}" activated`;
                    setDisplayedActiveProfile(profile);
                    revalidate();
                    revalidateActiveProfile();
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed to activate profile";
                    toast.message = getErrorMessage(error);
                  }
                }}
              />
              <Action.CopyToClipboard title="Copy Name" content={profile} />
              <Action
                title="Delete Profile"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDeleteProfile(profile)}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
