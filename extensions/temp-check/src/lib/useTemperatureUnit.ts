import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback } from "react";
import { Preferences } from "./types";

type TempUnit = "celsius" | "fahrenheit";

const STORAGE_KEY = "temperatureUnit";

export function useTemperatureUnit() {
  const prefs = getPreferenceValues<Preferences>();

  const { data: storedUnit, revalidate } = usePromise(async () => {
    const value = await LocalStorage.getItem<string>(STORAGE_KEY);
    return value as TempUnit | undefined;
  });

  const unit: TempUnit = storedUnit ?? prefs.temperatureUnit;

  const toggle = useCallback(async () => {
    const next: TempUnit = unit === "celsius" ? "fahrenheit" : "celsius";
    await LocalStorage.setItem(STORAGE_KEY, next);
    revalidate();
  }, [unit, revalidate]);

  return { unit, toggle };
}
