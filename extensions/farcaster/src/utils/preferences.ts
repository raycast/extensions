import { getPreferenceValues } from '@raycast/api';

interface Preferences {
  apiKey: string;
  farcasterClient: string;
  walletAddressClient: string;
}

export const preferences = getPreferenceValues<Preferences>();
