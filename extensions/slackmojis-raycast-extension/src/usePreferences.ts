import { getPreferenceValues } from "@raycast/api";

const usePreferences = () => {
  const preferences = getPreferenceValues();
  const downloadDirectory = preferences.downloadDirectory;

  return {
    downloadDirectory,
  };
};

export { usePreferences };
