import { List, ActionPanel, Action, showToast, Toast, Icon, Color, popToRoot } from "@raycast/api";
import { LIFXLight } from "../lib/types";
import { LIFXClientManager } from "../lib/lifx-client";

interface Props {
  light: LIFXLight;
  client: LIFXClientManager;
  onComplete: () => void;
}

// Generate brightness levels every 5%
const BRIGHTNESS_LEVELS = Array.from({ length: 20 }, (_, i) => (i + 1) * 5);

export function BrightnessControl({ light, client, onComplete }: Props) {
  async function setBrightness(value: number) {
    try {
      await client.controlLight(light.id, { brightness: value });
      showToast({ style: Toast.Style.Success, title: `Set ${light.label} to ${value}%` });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onComplete();
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to set brightness",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const getIcon = (value: number) => {
    if (value >= 75) return Icon.Sun;
    if (value >= 40) return Icon.Circle;
    return Icon.Moon;
  };

  const getDescription = (value: number) => {
    if (value === 100) return "Maximum brightness";
    if (value >= 75) return "Very bright";
    if (value >= 50) return "Medium brightness";
    if (value >= 25) return "Dim";
    if (value >= 10) return "Very dim";
    return "Night light mode";
  };

  return (
    <List searchBarPlaceholder="Select brightness level...">
      {BRIGHTNESS_LEVELS.map((value) => (
        <List.Item
          key={value}
          title={`${value}%`}
          subtitle={getDescription(value)}
          icon={{
            source: getIcon(value),
            tintColor: value === light.brightness ? Color.Green : Color.SecondaryText,
          }}
          accessories={value === light.brightness ? [{ tag: { value: "Current", color: Color.Green } }] : []}
          actions={
            <ActionPanel>
              <Action title={`Set to ${value}%`} icon={Icon.Checkmark} onAction={() => setBrightness(value)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
