import { getPreferenceValues } from '@raycast/api';

interface Preferences {
  token: string;
  includeGames: boolean;
}

export const usePreferences = () => {
  return getPreferenceValues<Preferences>();
};
