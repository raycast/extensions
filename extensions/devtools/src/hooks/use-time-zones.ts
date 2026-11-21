import { useLocalStorage } from "@raycast/utils";
import { DEFAULT_TIME_ZONES, readSavedTimeZones } from "../lib/time-zones";

export function useTimeZones() {
  const { value, setValue, isLoading } = useLocalStorage<unknown>("timestamp.timeZones", DEFAULT_TIME_ZONES);
  const timeZones = readSavedTimeZones(value) ?? DEFAULT_TIME_ZONES;

  return { timeZones, selectTimeZones: setValue, isLoading };
}
