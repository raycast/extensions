import { getPreferenceValues } from "@raycast/api";

export type Language = "en";

type ExtensionPreferences = {
  projectsFolder: string;
};

export type Settings = {
  projectsFolder: string;
  language: Language;
};

export function getSettings(): Settings {
  const preferences = getPreferenceValues<ExtensionPreferences>();

  return {
    projectsFolder: preferences.projectsFolder,
    language: "en",
  };
}
