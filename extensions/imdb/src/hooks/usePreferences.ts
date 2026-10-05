import { getPreferenceValues } from '@raycast/api';

export const usePreferences = () => {
  return getPreferenceValues<ExtensionPreferences>();
};
