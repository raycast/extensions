import { getPreferenceValues } from "@raycast/api";

export const preferences = getPreferenceValues<Preferences>();

export const getMaxFilesShown = () => {
  const parsed = parseInt(preferences.maxFilesShown, 10);
  const maxFilesShown = isNaN(parsed) ? 20 : parsed;
  if (maxFilesShown < 0) {
    return 0;
  }
  if (maxFilesShown > 100) {
    return 100;
  }
  return maxFilesShown;
};
