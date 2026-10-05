import { Action, ActionPanel, Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
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
        void showToast({
          style: Toast.Style.Failure,
          title: "Couldn't load profiles",
          message: error instanceof Error ? error.message : String(error),
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
                onAction={() => launchCommand({ name: "manage-profiles", type: LaunchType.UserInitiated })}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
