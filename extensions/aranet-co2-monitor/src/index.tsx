import { Icon, MenuBarExtra, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useAranetData, AranetDataPreference } from "./hooks/useAranetData";

export default function Command() {
  const preferences = getPreferenceValues<AranetDataPreference>();

  const { data, isLoading, error } = useAranetData(preferences);

  if (error) {
    return (
      <MenuBarExtra icon={Icon.Warning} title="Error" isLoading={isLoading}>
        <MenuBarExtra.Item title={`Error: ${error.message}`} />
        <MenuBarExtra.Item title="Open Preferences" onAction={openCommandPreferences} />
      </MenuBarExtra>
    );
  }

  const co2 = data?.co2 ?? 0;
  const tempC = data?.temperature ?? 0;
  const tempF = Math.round((tempC * 9) / 5 + 32);
  const humidity = data?.humidity ?? 0;
  const pressureHPa = data?.pressure ?? 0;
  const pressureAtm = (pressureHPa / 1013.25).toFixed(2);
  const battery = data?.battery ?? 0;
  const status = data?.status ?? "⚪️";

  return (
    <MenuBarExtra icon={status} title={`${co2}`} isLoading={isLoading}>
      <MenuBarExtra.Item title={`${tempF}°F`} icon={Icon.Temperature} />
      <MenuBarExtra.Item title={`${humidity}%`} icon={Icon.Raindrop} />
      <MenuBarExtra.Item title={`${pressureAtm} atm`} icon={Icon.Gauge} />
      <MenuBarExtra.Item title={`${battery}%`} icon={Icon.BatteryCharging} />
    </MenuBarExtra>
  );
}
