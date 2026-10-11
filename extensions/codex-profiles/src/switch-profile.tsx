import { Action, ActionPanel, Icon, LaunchType, List, launchCommand } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { displayProfilePath, getProfiles, type CodexProfile } from "./profiles";
import { openProfileWindow } from "./launch-profile";

export default function Command() {
  const [profiles, setProfiles] = useState<CodexProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getProfiles()
      .then(setProfiles)
      .catch((error: unknown) => {
        void showFailureToast(error, {
          title: "Couldn't load profiles",
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles">
      {profiles.map((profile) => (
        <List.Item
          key={profile.id}
          id={profile.id}
          title={profile.name}
          subtitle={displayProfilePath(profile.path)}
          actions={
            <ActionPanel>
              <Action title={`Open ${profile.name} Window`} icon={Icon.AppWindow} onAction={() => openProfileWindow(profile)} />
              <Action
                title="Manage Profiles"
                icon={Icon.Gear}
                onAction={async () => {
                  try {
                    await launchCommand({ name: "manage-profiles", type: LaunchType.UserInitiated });
                  } catch (error) {
                    await showFailureToast(error, { title: "Could not open Manage Profiles" });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
