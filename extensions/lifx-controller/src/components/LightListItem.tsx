import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Form,
  popToRoot,
  Detail,
  Keyboard,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { LIFXLight, LightProfile } from "../lib/types";
import { LIFXClientManager } from "../lib/lifx-client";
import { ProfileStorage } from "../lib/storage";
import { BrightnessControl } from "./BrightnessControl";
import { ColorPicker } from "./ColorPicker";
import { TemperatureControl } from "./TemperatureControl";

interface Props {
  light: LIFXLight;
  client: LIFXClientManager;
  onUpdate: () => void;
  onExecuteNlp?: () => Promise<void>;
}

const COLOR_SCENES = [
  { hue: 0, saturation: 100, brightness: 100, kelvin: 3500, name: "Red", icon: "🔴" },
  { hue: 120, saturation: 100, brightness: 100, kelvin: 3500, name: "Green", icon: "🟢" },
  { hue: 240, saturation: 100, brightness: 100, kelvin: 3500, name: "Blue", icon: "🔵" },
  { hue: 60, saturation: 100, brightness: 100, kelvin: 3500, name: "Yellow", icon: "🟡" },
  { hue: 300, saturation: 100, brightness: 100, kelvin: 3500, name: "Magenta", icon: "🩷" },
  { hue: 0, saturation: 0, brightness: 100, kelvin: 2700, name: "Warm Relax", icon: "🌅" },
  { hue: 0, saturation: 0, brightness: 75, kelvin: 3500, name: "Reading", icon: "📖" },
  { hue: 0, saturation: 0, brightness: 100, kelvin: 6500, name: "Energize", icon: "⚡" },
  { hue: 240, saturation: 50, brightness: 30, kelvin: 3500, name: "Night", icon: "🌙" },
];

function SaveProfileForm({ light, onSave }: { light: LIFXLight; onSave: () => void }) {
  const [profileName, setProfileName] = useState("");
  const [storage] = useState(() => new ProfileStorage());

  async function handleSubmit() {
    if (!profileName.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Profile name is required" });
      return;
    }

    try {
      const profile: LightProfile = {
        id: `profile-${Date.now()}`,
        name: profileName.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lights: [
          {
            lightId: light.id,
            lightLabel: light.label,
            power: light.power,
            brightness: light.brightness,
            hue: light.hue,
            saturation: light.saturation,
            kelvin: light.kelvin,
          },
        ],
      };

      await storage.saveProfile(profile);
      showToast({ style: Toast.Style.Success, title: `Saved profile "${profileName}"` });
      onSave();
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save profile",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Profile" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Profile Name"
        placeholder="My favorite setting"
        value={profileName}
        onChange={setProfileName}
      />
      <Form.Description
        text={`Save current state: ${light.power ? "On" : "Off"}, ${light.brightness}%, ${light.hue}°, ${light.kelvin}K`}
      />
    </Form>
  );
}

function LoadProfileList({
  light,
  client,
  onLoad,
}: {
  light: LIFXLight;
  client: LIFXClientManager;
  onLoad: () => void;
}) {
  const [profiles, setProfiles] = useState<LightProfile[]>([]);
  const [storage] = useState(() => new ProfileStorage());

  useEffect(() => {
    storage.getProfiles().then(setProfiles);
  }, []);

  async function applyProfile(profile: LightProfile) {
    try {
      // Validate profile has at least one light
      if (!profile.lights || profile.lights.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid profile",
          message: "Profile has no saved light states",
        });
        return;
      }
      const lightState = profile.lights[0];
      await client.controlLight(light.id, {
        power: lightState.power,
        brightness: lightState.brightness,
        hue: lightState.hue,
        saturation: lightState.saturation,
        kelvin: lightState.kelvin,
      });
      showToast({ style: Toast.Style.Success, title: `Applied profile "${profile.name}"` });
      // Wait for bulb to broadcast new state before refreshing UI
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onLoad();
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply profile",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List searchBarPlaceholder="Search profiles...">
      {profiles.length === 0 ? (
        <List.EmptyView
          title="No Profiles Saved"
          description="Save your current light setup as a profile"
          icon={Icon.SaveDocument}
        />
      ) : (
        profiles.map((profile: LightProfile) => (
          <List.Item
            key={profile.id}
            title={profile.name}
            accessories={[{ date: new Date(profile.updatedAt) }]}
            actions={
              <ActionPanel>
                <Action title="Apply Profile" icon={Icon.Checkmark} onAction={() => applyProfile(profile)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function LightDetailView({ light, client, onUpdate }: Props) {
  async function togglePower() {
    try {
      await client.controlLight(light.id, { power: !light.power });
      showToast({
        style: Toast.Style.Success,
        title: `Turned ${!light.power ? "on" : "off"} ${light.label}`,
      });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await onUpdate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle power",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function setBrightness(value: number) {
    try {
      await client.controlLight(light.id, { brightness: value });
      showToast({ style: Toast.Style.Success, title: `Set ${light.label} to ${value}%` });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await onUpdate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to set brightness",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function applyScene(scene: (typeof COLOR_SCENES)[0]) {
    try {
      await client.controlLight(light.id, {
        hue: scene.hue,
        saturation: scene.saturation,
        brightness: scene.brightness,
        kelvin: scene.kelvin,
      });
      showToast({ style: Toast.Style.Success, title: `Applied "${scene.name}" scene` });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await onUpdate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply scene",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const markdown = `
# ${light.label}

---

## Current State
- **Power:** ${light.power ? "🟢 On" : "🔴 Off"}
- **Brightness:** ${light.brightness}%
- **Hue:** ${light.hue}°
- **Saturation:** ${light.saturation}%
- **Kelvin:** ${light.kelvin}K
- **Connection:** ${light.source.toUpperCase()}

---

${light.saturation > 0 ? `**Color Mode:** ${light.hue}° hue at ${light.saturation}% saturation` : `**White Mode:** ${light.kelvin}K color temperature`}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Light Name" text={light.label} />
          <Detail.Metadata.Label
            title="Status"
            text={light.power ? "On" : "Off"}
            icon={{ source: Icon.CircleFilled, tintColor: light.power ? Color.Green : Color.Red }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Brightness" text={`${light.brightness}%`} />
          <Detail.Metadata.Label title="Hue" text={`${light.hue}°`} />
          <Detail.Metadata.Label title="Saturation" text={`${light.saturation}%`} />
          <Detail.Metadata.Label title="Temperature" text={`${light.kelvin}K`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Connection Type" text={light.source.toUpperCase()} />
          <Detail.Metadata.TagList title="Features">
            <Detail.Metadata.TagList.Item
              text={light.power ? "Powered" : "Off"}
              color={light.power ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Power">
            <Action
              title={light.power ? "Turn off" : "Turn on"}
              icon={light.power ? Icon.XMarkCircle : Icon.Power}
              onAction={togglePower}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Adjust">
            <Action.Push
              title="Set Brightness"
              icon={Icon.Sun}
              target={<BrightnessControl light={light} client={client} onComplete={onUpdate} />}
            />
            <Action.Push
              title="Set Color"
              icon={Icon.Pencil}
              target={<ColorPicker light={light} client={client} onComplete={onUpdate} />}
            />
            <Action.Push
              title="Set Temperature"
              icon={Icon.Temperature}
              target={<TemperatureControl light={light} client={client} onComplete={onUpdate} />}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Quick Brightness">
            <Action title="100%" onAction={() => setBrightness(100)} />
            <Action title="75%" onAction={() => setBrightness(75)} />
            <Action title="50%" onAction={() => setBrightness(50)} />
            <Action title="25%" onAction={() => setBrightness(25)} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Scenes">
            {COLOR_SCENES.map((scene) => (
              <Action key={scene.name} title={`${scene.icon} ${scene.name}`} onAction={() => applyScene(scene)} />
            ))}
          </ActionPanel.Section>

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Light Name"
              content={light.label}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Light ID"
              content={light.id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function LightListItem({ light, client, onUpdate, onExecuteNlp }: Props) {
  // Determine icon color based on light state
  const getTintColor = () => {
    if (!light.power) return Color.SecondaryText;
    if (light.saturation > 0) {
      // Color mode - use hue to determine color
      if (light.hue >= 0 && light.hue < 30) return Color.Red;
      if (light.hue >= 30 && light.hue < 90) return Color.Yellow;
      if (light.hue >= 90 && light.hue < 150) return Color.Green;
      if (light.hue >= 150 && light.hue < 210) return Color.Blue;
      if (light.hue >= 210 && light.hue < 270) return Color.Purple;
      if (light.hue >= 270 && light.hue < 330) return Color.Magenta;
      return Color.Red;
    }
    // White mode
    return Color.Orange;
  };

  // Determine locale-appropriate spelling (British English uses "colour", American uses "color")
  const isUK = Intl.DateTimeFormat().resolvedOptions().locale.startsWith("en-GB");
  const colorText = isUK ? "Colour" : "Color";

  const accessories = [
    {
      text: light.power ? "On" : "Off",
      icon: { source: Icon.CircleFilled, tintColor: light.power ? Color.Green : Color.Red },
    },
    {
      text: `${light.brightness}%`,
      icon: Icon.Sun,
    },
    {
      tag: { value: light.saturation > 0 ? colorText : "White", color: getTintColor() },
    },
    { text: light.source.toUpperCase(), tooltip: `Connected via ${light.source}` },
  ];

  async function togglePower() {
    try {
      await client.controlLight(light.id, { power: !light.power });
      showToast({
        style: Toast.Style.Success,
        title: `Turned ${!light.power ? "on" : "off"} ${light.label}`,
      });
      // Wait for bulb to broadcast new state before refreshing UI
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await onUpdate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle power",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function setBrightness(value: number) {
    try {
      await client.controlLight(light.id, { brightness: value });
      showToast({ style: Toast.Style.Success, title: `Set ${light.label} to ${value}%` });
      // Wait for bulb to broadcast new state before refreshing UI
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await onUpdate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to set brightness",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function setWhiteTemperature(kelvin: number) {
    try {
      // Only set kelvin and saturation - brightness will be preserved automatically
      await client.controlLight(light.id, {
        kelvin,
        saturation: 0,
      });
      showToast({ style: Toast.Style.Success, title: `Set ${light.label} to ${kelvin}K` });
      // Wait for bulb to broadcast new state before refreshing UI
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await onUpdate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to set temperature",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function applyScene(scene: (typeof COLOR_SCENES)[0]) {
    try {
      await client.controlLight(light.id, {
        hue: scene.hue,
        saturation: scene.saturation,
        brightness: scene.brightness,
        kelvin: scene.kelvin,
      });
      showToast({ style: Toast.Style.Success, title: `Applied "${scene.name}" scene` });
      // Wait for bulb to broadcast new state before refreshing UI
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await onUpdate();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply scene",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List.Item
      title={light.label}
      subtitle={`${light.hue}° • ${light.kelvin}K`}
      icon={{ source: Icon.LightBulb, tintColor: getTintColor() }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Quick Actions">
            <Action
              title={light.power ? "Turn off" : "Turn on"}
              icon={light.power ? Icon.XMarkCircle : Icon.Power}
              onAction={togglePower}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "p" }}
            />
            {onExecuteNlp && (
              <Action
                title="Execute Natural Language Command"
                icon={Icon.Wand}
                onAction={onExecuteNlp}
                shortcut={{ modifiers: ["ctrl"], key: "return" }}
              />
            )}
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<LightDetailView light={light} client={client} onUpdate={onUpdate} />}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Adjust">
            <Action.Push
              title="Set Brightness"
              icon={Icon.Sun}
              target={<BrightnessControl light={light} client={client} onComplete={onUpdate} />}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "b" }}
            />
            <Action.Push
              title="Set Color"
              icon={Icon.Pencil}
              target={<ColorPicker light={light} client={client} onComplete={onUpdate} />}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
            />
            <Action.Push
              title="Set Temperature"
              icon={Icon.Temperature}
              target={<TemperatureControl light={light} client={client} onComplete={onUpdate} />}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "t" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Scenes">
            {COLOR_SCENES.map((scene, idx) => (
              <Action
                key={scene.name}
                title={`${scene.icon} ${scene.name}`}
                onAction={() => applyScene(scene)}
                shortcut={
                  idx < 9
                    ? { modifiers: ["ctrl", "shift"], key: (idx + 1).toString() as Keyboard.KeyEquivalent }
                    : undefined
                }
              />
            ))}
          </ActionPanel.Section>

          <ActionPanel.Section title="Quick Brightness">
            <Action
              title="100% Brightness"
              icon={Icon.Sun}
              onAction={() => setBrightness(100)}
              shortcut={{ modifiers: ["ctrl"], key: "1" }}
            />
            <Action
              title="75% Brightness"
              icon={Icon.Sun}
              onAction={() => setBrightness(75)}
              shortcut={{ modifiers: ["ctrl"], key: "2" }}
            />
            <Action
              title="50% Brightness"
              icon={Icon.Circle}
              onAction={() => setBrightness(50)}
              shortcut={{ modifiers: ["ctrl"], key: "3" }}
            />
            <Action
              title="25% Brightness"
              icon={Icon.Circle}
              onAction={() => setBrightness(25)}
              shortcut={{ modifiers: ["ctrl"], key: "4" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Quick White">
            <Action title="Warm White (2700K)" icon={Icon.LightBulb} onAction={() => setWhiteTemperature(2700)} />
            <Action title="Neutral White (3500K)" icon={Icon.LightBulb} onAction={() => setWhiteTemperature(3500)} />
            <Action title="Cool White (6500K)" icon={Icon.LightBulb} onAction={() => setWhiteTemperature(6500)} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Profiles">
            <Action.Push
              title="Save as Profile"
              icon={Icon.SaveDocument}
              target={<SaveProfileForm light={light} onSave={onUpdate} />}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "s" }}
            />
            <Action.Push
              title="Load Profile"
              icon={Icon.Document}
              target={<LoadProfileList light={light} client={client} onLoad={onUpdate} />}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "l" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
