import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";

import { ProfileEditor } from "./ProfileEditor";
import { sortProfiles } from "./profileUtils";
import type { ProfilesState } from "./types";

export function ProfileManager({ profiles, setProfiles }: ProfilesState) {
  async function removeProfile(profileId: string) {
    const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
    await setProfiles(nextProfiles);
    await showToast({
      style: Toast.Style.Success,
      title: "Profile removed",
    });
  }

  async function makeDefault(profileId: string) {
    await setProfiles(
      profiles.map((profile) => ({
        ...profile,
        isDefault: profile.id === profileId,
      })),
    );
    await showToast({
      style: Toast.Style.Success,
      title: "Default profile updated",
    });
  }

  return (
    <List searchBarPlaceholder="Filter browser profiles">
      <List.EmptyView
        title="No browser profiles yet"
        description="Add one profile to reuse it from the search form."
        actions={
          <ActionPanel>
            <Action.Push title="Add Profile" target={<ProfileEditor profiles={profiles} setProfiles={setProfiles} />} />
          </ActionPanel>
        }
      />
      {sortProfiles(profiles).map((profile) => (
        <List.Item
          key={profile.id}
          title={profile.name}
          subtitle={`${profile.browserApp} · ${profile.profileDirectory}${profile.isDefault ? " · Default" : ""}`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Profile"
                target={<ProfileEditor profile={profile} profiles={profiles} setProfiles={setProfiles} />}
              />
              <Action title="Make Default" onAction={() => makeDefault(profile.id)} />
              <Action title="Delete Profile" onAction={() => removeProfile(profile.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
