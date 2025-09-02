import { getPreferenceValues } from '@raycast/api';

interface Preferences {
  apiKey: string;
  walletAddressClient: string;
}

export const preferences = getPreferenceValues<Preferences>();
