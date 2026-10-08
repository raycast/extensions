import { List, ActionPanel, Action, Icon, showToast, Toast, Alert, confirmAlert, Color } from "@raycast/api";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { ProfileStorage } from "./lib/storage";
import { LightProfile, ProfileLightState } from "./lib/types";

export default function Command() {
  const [profiles, setProfiles] = useState<LightProfile[]>([]);
  const [storage] = useState(() => new ProfileStorage());

  const { isLoading, revalidate } = usePromise(
    async () => {
      const savedProfiles = await storage.getProfiles();
      setProfiles(savedProfiles);
      return savedProfiles;
    },
    [],
    {
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load profiles",
          message: error instanceof Error ? error.message : String(error),
        });
      },
    },
  );

  async function deleteProfile(profile: LightProfile) {
    const confirmed = await confirmAlert({
      title: `Delete profile "${profile.name}"?`,
      message: "This action cannot be undone",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      await storage.deleteProfile(profile.id);
      showToast({ style: Toast.Style.Success, title: `Deleted profile "${profile.name}"` });
      await revalidate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete profile",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles...">
      {profiles.length === 0 ? (
        <List.EmptyView
          title="No Profiles Saved"
          description="Save your current light setup as a profile from the main command"
          icon={Icon.SaveDocument}
        />
      ) : (
        profiles.map((profile) => (
          <List.Item
            key={profile.id}
            title={profile.name}
            subtitle={profile.description}
            accessories={[
              { text: `${profile.lights.length} light${profile.lights.length !== 1 ? "s" : ""}` },
              { date: new Date(profile.updatedAt) },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Delete Profile"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteProfile(profile)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Details">
                  <Action.CopyToClipboard
                    title="Copy Profile Name"
                    content={profile.name}
                    shortcut={{ modifiers: ["ctrl"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Profile Name"
                      text={profile.name}
                      icon={Icon.SaveDocument}
                    />
                    {profile.description && (
                      <List.Item.Detail.Metadata.Label title="Description" text={profile.description} />
                    )}
                    {profile.tags && profile.tags.length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {profile.tags.map((tag: string) => (
                          <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} color={Color.Blue} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={new Date(profile.createdAt).toLocaleString()}
                      icon={Icon.Calendar}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Last Updated"
                      text={new Date(profile.updatedAt).toLocaleString()}
                      icon={Icon.Clock}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Lights"
                      text={`${profile.lights.length} total`}
                      icon={Icon.LightBulb}
                    />
                    {profile.lights.map((light: ProfileLightState) => (
                      <List.Item.Detail.Metadata.Label
                        key={light.lightId}
                        title={light.lightLabel}
                        text={`${light.power ? "On" : "Off"} • ${light.brightness}% • ${light.hue}° • ${light.kelvin}K`}
                        icon={{
                          source: Icon.CircleFilled,
                          tintColor: light.power ? Color.Green : Color.Red,
                        }}
                      />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      )}
    </List>
  );
}
