import { getPreferenceValues } from "@raycast/api";

export type ExtensionPreferences = {
  build: string;
};

function getPreferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

export const build = (() => getPreferences().build || "Code")();

export function getBuild(): string {
  return getPreferences().build || "Code";
}
