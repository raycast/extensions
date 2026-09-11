import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./interfaces";

export type TemperatureUnitPreference = "device" | "c" | "f";

/**
 * Defaults to following the device's own `temp_unit_convert` setting, so the extension
 * agrees with what the Tuya app shows. The override exists for products that never
 * report that data point, which would otherwise always read as Celsius.
 */
export function temperatureUnitPreference(): TemperatureUnitPreference {
  try {
    const { temperatureUnit } = getPreferenceValues<Preferences>();
    return temperatureUnit === "c" || temperatureUnit === "f" ? temperatureUnit : "device";
  } catch {
    // Preferences are unavailable outside a command context; follow the device.
    return "device";
  }
}
