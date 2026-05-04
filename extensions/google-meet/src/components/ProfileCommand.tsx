import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCallback, useState } from "react";
import { ProfileList, ProfileForm } from "./";

type SelectionMode = "add_profile" | undefined;

export function ProfileCommand({ refocus }: { refocus?: boolean }) {
  const [selectionMode, setSelectionMode] = useState<SelectionMode>();

  const onFinish = useCallback(() => setSelectionMode(undefined), []);

  return (
    <>
      <List>
        <List.Item
          title="Create a new profile..."
          icon={{
            value: Icon.AddPerson,
            tooltip: "Add new profile to the list",
          }}
          actions={
            <ActionPanel>
              <Action title="Create a New Profile" onAction={() => setSelectionMode("add_profile")}></Action>
            </ActionPanel>
          }
        />

        <List.Section title="Profiles" subtitle="List of created profiles to start a new Google Meet">
          <ProfileList refocus={refocus} />
        </List.Section>
      </List>

      {selectionMode === "add_profile" && <ProfileForm onFinish={onFinish} />}
    </>
  );
}
