import { getPreferenceValues } from '@raycast/api';
import { Preferences } from '../types';

const getPreference = () => {
  const { versionManager } = getPreferenceValues<Preferences>();

  return {
    versionManager,
  };
};

export default getPreference();
