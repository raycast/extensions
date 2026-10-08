import { List, ActionPanel, Action, Icon, showToast, Toast, Alert, confirmAlert, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { usePromise } from "@raycast/utils";
import { LIFXClientManager } from "./lib/lifx-client";
import { ProfileStorage } from "./lib/storage";
import { LightProfile } from "./lib/types";

export default function Command() {
  const [profiles, setProfiles] = useState<LightProfile[]>([]);
  const [client] = useState(() => new LIFXClientManager());
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

  useEffect(() => {
    return () => {
      client.destroy();
    };
  }, []);

  async function applyProfile(profile: LightProfile) {
    const confirmed = await confirmAlert({
      title: `Apply profile "${profile.name}"?`,
      message: `This will update ${profile.lights.length} light${profile.lights.length !== 1 ? "s" : ""}`,
      primaryAction: { title: "Apply", style: Alert.ActionStyle.Default },
    });

    if (!confirmed) return;

    try {
      await client.initialize();

      let successCount = 0;
      let failCount = 0;

      for (const lightState of profile.lights) {
        try {
          await client.controlLight(lightState.lightId, {
            power: lightState.power,
            brightness: lightState.brightness,
            hue: lightState.hue,
            saturation: lightState.saturation,
            kelvin: lightState.kelvin,
          });
          successCount++;
        } catch (error) {
          console.warn(`Failed to apply profile to ${lightState.lightLabel}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        showToast({
          style: Toast.Style.Success,
          title: `Applied profile to ${successCount} light${successCount !== 1 ? "s" : ""}`,
          message: failCount > 0 ? `${failCount} light${failCount !== 1 ? "s" : ""} failed` : undefined,
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to apply profile",
          message: "No lights were updated",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply profile",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles...">
      {profiles.length === 0 ? (
        <List.EmptyView
          title="No Profiles Saved"
          description="Use the 'Save Profile' command from the LIFX Dashboard to save your current light setup"
          icon={Icon.SaveDocument}
        />
      ) : (
        profiles.map((profile: LightProfile) => {
          const accessories: List.Item.Accessory[] = [];

          if (profile.tags && profile.tags.length > 0) {
            accessories.push({
              tag: { value: profile.tags[0], color: Color.Blue },
              tooltip: `Tags: ${profile.tags.join(", ")}`,
            });
          }

          accessories.push({
            text: `${profile.lights.length} light${profile.lights.length !== 1 ? "s" : ""}`,
            icon: Icon.LightBulb,
          });
          accessories.push({ date: new Date(profile.updatedAt) });

          return (
            <List.Item
              key={profile.id}
              title={profile.name}
              subtitle={profile.description}
              icon={{ source: Icon.SaveDocument, tintColor: Color.Green }}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Profile Actions">
                    <Action
                      title="Apply Profile"
                      icon={Icon.Checkmark}
                      onAction={() => applyProfile(profile)}
                      shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Profile Name"
                      content={profile.name}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    {profile.description && (
                      <Action.CopyToClipboard
                        title="Copy Description"
                        content={profile.description}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      onAction={revalidate}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
