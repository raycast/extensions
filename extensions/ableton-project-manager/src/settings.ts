import { getPreferenceValues } from "@raycast/api";

export type Language = "en";

export type Settings = {
  projectsFolder: string;
  language: Language;
};

export function getSettings(): Settings {
  const preferences = getPreferenceValues<Preferences>();

  return {
    projectsFolder: preferences.projectsFolder,
    language: "en",
  };
}
