import { getPreferenceValues } from '@raycast/api';

interface Preferences {
  token: string;
  includeGames: boolean;
  openIn: 'raycast' | 'browser';
}

export const usePreferences = () => {
  return getPreferenceValues<Preferences>();
};
