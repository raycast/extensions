import { Icon, MenuBarExtra, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useAranetData } from "./hooks/useAranetData";
import { useRef } from "react";

export default function Command() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const { data, isLoading, error } = useAranetData(preferences);

  const cachedData = useRef(data);
  if (data) {
    cachedData.current = data;
  }

  const activeData = data ?? cachedData.current;

  const co2 = activeData?.co2;
  const tempC = activeData?.temperature;
  const tempF = tempC !== undefined ? Math.round((tempC * 9) / 5 + 32) : undefined;
  const humidity = activeData?.humidity;
  const pressureHPa = activeData?.pressure;
  const pressureAtm = pressureHPa !== undefined ? (pressureHPa / 1013.25).toFixed(2) : undefined;
  const battery = activeData?.battery;
  const status = activeData?.status ?? "⚪️";

  return (
    <MenuBarExtra icon={status} title={error ? "-" : (co2?.toString() ?? "-")} isLoading={isLoading}>
      <MenuBarExtra.Item title={tempF !== undefined ? `${tempF}°F` : "-"} icon={Icon.Temperature} />
      <MenuBarExtra.Item title={humidity !== undefined ? `${humidity}%` : "-"} icon={Icon.Raindrop} />
      <MenuBarExtra.Item title={pressureAtm !== undefined ? `${pressureAtm} atm` : "-"} icon={Icon.Gauge} />
      <MenuBarExtra.Item title={battery !== undefined ? `${battery}%` : "-"} icon={Icon.BatteryCharging} />

      {error && (
        <>
          <MenuBarExtra.Separator />
          <MenuBarExtra.Item title={`Error: ${error.message}`} icon={Icon.Warning} />
          <MenuBarExtra.Item title="Open Preferences" onAction={openCommandPreferences} />
        </>
      )}
    </MenuBarExtra>
  );
}
