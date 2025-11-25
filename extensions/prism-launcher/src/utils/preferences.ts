import { type Application, getPreferenceValues } from "@raycast/api";

type Preferences = {
  installPath: Application;
  instancesPath: string;
};

export function getPreferences<T extends keyof Preferences>(key: T): Preferences[T] {
  return getPreferenceValues<Preferences>()[key];
}
