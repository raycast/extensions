import { getPreferenceValues } from "@raycast/api";

export type Settings = {
  projectsFolder: string;
};

export function getSettings(): Settings {
  const preferences = getPreferenceValues<Preferences>();

  return {
    projectsFolder: preferences.projectsFolder,
  };
}
