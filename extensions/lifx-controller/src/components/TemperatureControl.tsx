import { List, ActionPanel, Action, showToast, Toast, Color, popToRoot } from "@raycast/api";
import { LIFXLight } from "../lib/types";
import { LIFXClientManager } from "../lib/lifx-client";

interface Props {
  light: LIFXLight;
  client: LIFXClientManager;
  onComplete: () => void;
}

const TEMPERATURE_OPTIONS = [
  { value: 2500, label: "Ultra Warm", icon: "🔥", description: "Candlelight, very warm orange glow" },
  { value: 2700, label: "Warm White", icon: "🌅", description: "Incandescent bulb, cozy and relaxing" },
  { value: 3000, label: "Soft White", icon: "💡", description: "Halogen bulb, warm and inviting" },
  { value: 3500, label: "Neutral White", icon: "⚪", description: "Balanced, natural white light" },
  { value: 4000, label: "Cool White", icon: "💎", description: "Bright and clean, office lighting" },
  { value: 4500, label: "Bright White", icon: "💠", description: "Crisp and energizing" },
  { value: 5000, label: "Daylight", icon: "☀️", description: "Natural daylight, perfect for reading" },
  { value: 5500, label: "Bright Daylight", icon: "🌤️", description: "Midday sun, very bright" },
  { value: 6000, label: "Cool Daylight", icon: "❄️", description: "Overcast sky, cool and alert" },
  { value: 6500, label: "Cloudy Daylight", icon: "☁️", description: "Cloudy day, bright and cool" },
  { value: 7000, label: "Very Cool", icon: "🧊", description: "Shade lighting, very cool blue" },
  { value: 9000, label: "Ultra Cool", icon: "💙", description: "Blue sky, extremely cool" },
];

export function TemperatureControl({ light, client, onComplete }: Props) {
  async function setTemperature(value: number) {
    try {
      await client.controlLight(light.id, {
        kelvin: value,
        saturation: 0,
      });
      showToast({ style: Toast.Style.Success, title: `Set ${light.label} to ${value}K` });
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onComplete();
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to set temperature",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List searchBarPlaceholder="Select white temperature...">
      <List.Section title="Warm to Cool">
        {TEMPERATURE_OPTIONS.map((temp) => (
          <List.Item
            key={temp.value}
            title={`${temp.icon} ${temp.label}`}
            subtitle={`${temp.value}K`}
            accessories={[
              { text: temp.description },
              temp.value === light.kelvin ? { tag: { value: "Current", color: Color.Green } } : {},
            ]}
            actions={
              <ActionPanel>
                <Action title={`Set to ${temp.value}K`} onAction={() => setTemperature(temp.value)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
