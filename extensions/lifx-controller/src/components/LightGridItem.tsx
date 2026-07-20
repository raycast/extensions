import { Grid, ActionPanel, Action, Icon, Color, showToast, Toast, Detail, Keyboard } from "@raycast/api";
import { LIFXLight } from "../lib/types";
import { LIFXClientManager } from "../lib/lifx-client";
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

function LightDetailView({ light, client, onUpdate }: Props) {
  const getColorFromHSB = (hue: number, saturation: number, brightness: number) => {
    // Convert HSB to RGB for display
    const h = hue / 360;
    const s = saturation / 100;
    const v = brightness / 100;

    let r = 0,
      g = 0,
      b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }

    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  };

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

## Color Preview
${light.saturation > 0 ? `**Color:** ${getColorFromHSB(light.hue, light.saturation, light.brightness)}` : `**White Temperature:** ${light.kelvin}K`}
`;

  async function togglePower() {
    try {
      await client.controlLight(light.id, { power: !light.power });
      showToast({
        style: Toast.Style.Success,
        title: `Turned ${!light.power ? "on" : "off"} ${light.label}`,
      });
      // Wait for LIFX bulb to internally update and broadcast its new state via LAN
      // before refreshing. Required because LIFX bulbs take time to propagate state changes.
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
            <Detail.Metadata.TagList.Item text={light.saturation > 0 ? "Color" : "White"} color={Color.Blue} />
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
        </ActionPanel>
      }
    />
  );
}

export function LightGridItem({ light, client, onUpdate, onExecuteNlp }: Props) {
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

  async function setWhiteTemperature(kelvin: number) {
    try {
      await client.controlLight(light.id, { kelvin, saturation: 0 });
      showToast({ style: Toast.Style.Success, title: `Set ${light.label} to ${kelvin}K` });
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
    <Grid.Item
      title={light.label}
      subtitle={`${light.brightness}% • ${light.saturation > 0 ? `${light.hue}°` : `${light.kelvin}K`}`}
      content={{
        source: Icon.LightBulb,
        tintColor: getTintColor(),
      }}
      accessory={{
        icon: { source: Icon.CircleFilled, tintColor: light.power ? Color.Green : Color.Red },
        tooltip: light.power ? "On" : "Off",
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Quick Actions">
            <Action
              title={light.power ? "Turn off" : "Turn on"}
              icon={light.power ? Icon.XMarkCircle : Icon.Power}
              onAction={togglePower}
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
              shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            />
            <Action.Push
              title="Set Color"
              icon={Icon.Pencil}
              target={<ColorPicker light={light} client={client} onComplete={onUpdate} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.Push
              title="Set Temperature"
              icon={Icon.Temperature}
              target={<TemperatureControl light={light} client={client} onComplete={onUpdate} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Quick Brightness">
            <Action
              title="100%"
              icon={Icon.Sun}
              onAction={() => setBrightness(100)}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
            />
            <Action
              title="75%"
              icon={Icon.Sun}
              onAction={() => setBrightness(75)}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
            <Action
              title="50%"
              icon={Icon.Circle}
              onAction={() => setBrightness(50)}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
            />
            <Action
              title="25%"
              icon={Icon.Circle}
              onAction={() => setBrightness(25)}
              shortcut={{ modifiers: ["cmd"], key: "4" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Quick White">
            <Action title="Warm (2700K)" onAction={() => setWhiteTemperature(2700)} />
            <Action title="Neutral (3500K)" onAction={() => setWhiteTemperature(3500)} />
            <Action title="Cool (6500K)" onAction={() => setWhiteTemperature(6500)} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Scenes">
            {COLOR_SCENES.map((scene, idx) => (
              <Action
                key={scene.name}
                title={`${scene.icon} ${scene.name}`}
                onAction={() => applyScene(scene)}
                shortcut={
                  idx < 9
                    ? { modifiers: ["cmd", "shift"], key: (idx + 1).toString() as Keyboard.KeyEquivalent }
                    : undefined
                }
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
