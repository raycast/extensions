import { Application, getPreferenceValues } from "@raycast/api";

export const bundleIds = <const>["com.lukilabs.lukiapp", "com.lukilabs.lukiapp-setapp"];

export interface Preferences {
  application: Application;
}

export const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};
