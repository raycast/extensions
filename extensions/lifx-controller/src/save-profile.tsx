import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { usePromise } from "@raycast/utils";
import { LIFXClientManager } from "./lib/lifx-client";
import { ProfileStorage } from "./lib/storage";
import { LIFXLight, LightProfile } from "./lib/types";

export default function Command() {
  const [lights, setLights] = useState<LIFXLight[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [profileTags, setProfileTags] = useState<string[]>([]);
  const [client] = useState(() => new LIFXClientManager());
  const [storage] = useState(() => new ProfileStorage());

  const { isLoading } = usePromise(
    async () => {
      await client.initialize();
      const discoveredLights = await client.discoverLights();
      setLights(discoveredLights);
      return discoveredLights;
    },
    [],
    {
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to discover lights",
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

  async function handleSubmit() {
    if (!profileName.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Profile name is required" });
      return;
    }

    if (lights.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "No lights available to save" });
      return;
    }

    try {
      const profile: LightProfile = {
        id: `profile-${Date.now()}`,
        name: profileName.trim(),
        description: profileDescription.trim() || undefined,
        tags: profileTags.length > 0 ? profileTags : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lights: lights.map((light) => ({
          lightId: light.id,
          lightLabel: light.label,
          power: light.power,
          brightness: light.brightness,
          hue: light.hue,
          saturation: light.saturation,
          kelvin: light.kelvin,
        })),
      };

      await storage.saveProfile(profile);
      showToast({
        style: Toast.Style.Success,
        title: `Saved profile "${profileName}"`,
        message: `${lights.length} light${lights.length !== 1 ? "s" : ""} saved`,
      });
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save profile",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const tagOptions = [
    { value: "work", title: "Work" },
    { value: "relax", title: "Relax" },
    { value: "sleep", title: "Sleep" },
    { value: "focus", title: "Focus" },
    { value: "party", title: "Party" },
    { value: "reading", title: "Reading" },
    { value: "gaming", title: "Gaming" },
    { value: "movie", title: "Movie" },
    { value: "morning", title: "Morning" },
    { value: "evening", title: "Evening" },
  ];

  const nameError = profileName.trim() === "" ? "Profile name is required" : undefined;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Profile"
            icon={Icon.SaveDocument}
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action
            title="Cancel"
            icon={Icon.XMarkCircle}
            onAction={popToRoot}
            shortcut={{ modifiers: ["cmd"], key: "w" }}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Profile Name"
        placeholder="Evening ambiance"
        value={profileName}
        onChange={setProfileName}
        error={nameError}
        info="Give your profile a memorable name"
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description for this profile"
        value={profileDescription}
        onChange={setProfileDescription}
        enableMarkdown
      />
      <Form.TagPicker
        id="tags"
        title="Tags"
        placeholder="Add tags to organize profiles"
        value={profileTags}
        onChange={setProfileTags}
      >
        {tagOptions.map((tag) => (
          <Form.TagPicker.Item key={tag.value} value={tag.value} title={tag.title} />
        ))}
      </Form.TagPicker>
      <Form.Separator />
      <Form.Description
        title="Lights to Save"
        text={`This profile will save the current state of ${lights.length} light${lights.length !== 1 ? "s" : ""}:\n\n${lights.map((l: LIFXLight) => `• ${l.label} - ${l.power ? "On" : "Off"}, ${l.brightness}%`).join("\n")}`}
      />
    </Form>
  );
}
