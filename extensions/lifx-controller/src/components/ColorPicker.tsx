import { Grid, ActionPanel, Action, showToast, Toast, Color, popToRoot } from "@raycast/api";
import { LIFXLight } from "../lib/types";
import { LIFXClientManager } from "../lib/lifx-client";

interface Props {
  light: LIFXLight;
  client: LIFXClientManager;
  onComplete: () => void;
}

// Create a comprehensive color palette
const COLORS = [
  // Vivid colors (100% saturation)
  { hue: 0, saturation: 100, label: "Red", icon: "🔴" },
  { hue: 15, saturation: 100, label: "Red-Orange", icon: "🟠" },
  { hue: 30, saturation: 100, label: "Orange", icon: "🟠" },
  { hue: 45, saturation: 100, label: "Orange-Yellow", icon: "🟡" },
  { hue: 60, saturation: 100, label: "Yellow", icon: "🟡" },
  { hue: 90, saturation: 100, label: "Yellow-Green", icon: "💚" },
  { hue: 120, saturation: 100, label: "Green", icon: "🟢" },
  { hue: 150, saturation: 100, label: "Spring Green", icon: "🩵" },
  { hue: 180, saturation: 100, label: "Cyan", icon: "🩵" },
  { hue: 210, saturation: 100, label: "Sky Blue", icon: "🔵" },
  { hue: 240, saturation: 100, label: "Blue", icon: "🔵" },
  { hue: 270, saturation: 100, label: "Purple", icon: "🟣" },
  { hue: 300, saturation: 100, label: "Magenta", icon: "🩷" },
  { hue: 330, saturation: 100, label: "Pink-Red", icon: "💗" },
  // Pastel colors (50% saturation)
  { hue: 0, saturation: 50, label: "Light Pink", icon: "💗" },
  { hue: 30, saturation: 50, label: "Peach", icon: "🍑" },
  { hue: 60, saturation: 50, label: "Light Yellow", icon: "💛" },
  { hue: 120, saturation: 50, label: "Mint", icon: "🌿" },
  { hue: 180, saturation: 50, label: "Light Cyan", icon: "💙" },
  { hue: 240, saturation: 50, label: "Light Blue", icon: "💙" },
  { hue: 270, saturation: 50, label: "Lavender", icon: "💜" },
  { hue: 300, saturation: 50, label: "Light Magenta", icon: "💗" },
];

export function ColorPicker({ light, client, onComplete }: Props) {
  async function setColor(hue: number, saturation: number, label: string) {
    try {
      await client.controlLight(light.id, {
        hue,
        saturation,
      });
      showToast({ style: Toast.Style.Success, title: `Set ${light.label} to ${label}` });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onComplete();
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to set color",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const isCurrent = (hue: number, saturation: number) => {
    return Math.abs(light.hue - hue) < 15 && Math.abs(light.saturation - saturation) < 10;
  };

  return (
    <Grid columns={4} aspectRatio="1" fit={Grid.Fit.Fill} searchBarPlaceholder="Search colors...">
      <Grid.Section title="Vivid Colors">
        {COLORS.filter((c) => c.saturation === 100).map((color) => (
          <Grid.Item
            key={`${color.hue}-${color.saturation}`}
            content={{ value: color.icon, tooltip: color.label }}
            title={color.label}
            subtitle={`${color.hue}° • ${color.saturation}%`}
            accessory={
              isCurrent(color.hue, color.saturation) ? { tag: { value: "Current", color: Color.Green } } : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Set to ${color.label}`}
                  onAction={() => setColor(color.hue, color.saturation, color.label)}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
      <Grid.Section title="Pastel Colors">
        {COLORS.filter((c) => c.saturation === 50).map((color) => (
          <Grid.Item
            key={`${color.hue}-${color.saturation}`}
            content={{ value: color.icon, tooltip: color.label }}
            title={color.label}
            subtitle={`${color.hue}° • ${color.saturation}%`}
            accessory={
              isCurrent(color.hue, color.saturation) ? { tag: { value: "Current", color: Color.Green } } : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Set to ${color.label}`}
                  onAction={() => setColor(color.hue, color.saturation, color.label)}
                />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}
