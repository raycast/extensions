import { Icon, List, getPreferenceValues, ActionPanel, Action, Color, openCommandPreferences } from "@raycast/api";
import { useAranetData } from "./hooks/useAranetData";

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const { data, isLoading, error } = useAranetData(preferences);

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "🟢":
        return Color.Green;
      case "🟡":
        return Color.Yellow;
      case "🔴":
        return Color.Red;
      default:
        return Color.Green;
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Error Connecting to Aranet"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openCommandPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const co2 = data?.co2;
  const tempC = data?.temperature;
  const humidity = data?.humidity;
  const pressureHPa = data?.pressure;
  const battery = data?.battery;
  const status = data?.status;

  const tempF = tempC ? Math.round((tempC * 9) / 5 + 32) : undefined;
  const pressureAtm = pressureHPa ? (pressureHPa / 1013.25).toFixed(2) : undefined;

  return (
    <List isLoading={isLoading}>
      {co2 !== undefined && (
        <List.Item
          icon={{ source: Icon.Circle, tintColor: getStatusColor(status) }}
          title="CO2 Level"
          accessories={[{ text: `${co2} ppm` }]}
        />
      )}
      {tempF !== undefined && (
        <List.Item
          icon={Icon.Temperature}
          title="Temperature"
          accessories={[{ text: `${tempF}°F` }, { text: `(${tempC?.toFixed(1)}°C)` }]}
        />
      )}
      {humidity !== undefined && (
        <List.Item icon={Icon.Raindrop} title="Humidity" accessories={[{ text: `${humidity}%` }]} />
      )}
      {pressureAtm !== undefined && (
        <List.Item
          icon={Icon.Gauge}
          title="Pressure"
          accessories={[{ text: `${pressureAtm} atm` }, { text: `(${pressureHPa} hPa)` }]}
        />
      )}
      {battery !== undefined && (
        <List.Item icon={Icon.Battery} title="Battery" accessories={[{ text: `${battery}%` }]} />
      )}
    </List>
  );
}
