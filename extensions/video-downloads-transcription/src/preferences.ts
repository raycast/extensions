import { environment, getPreferenceValues } from "@raycast/api";
import { Settings } from "./core";

/** Extension preferences, plus the support folder for downloaded models. */
export function preferences(): Settings {
  return {
    ...getPreferenceValues<Settings>(),
    supportPath: environment.supportPath,
  };
}
