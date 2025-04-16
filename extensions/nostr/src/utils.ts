import { getPreferenceValues, showToast, Toast } from '@raycast/api';
import { showFailureToast } from '@raycast/utils';

type Preferences = {
  privateKey: string;
  relays?: string;
};

export function loadPrivateKey(): string | undefined {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const privateKey = preferences.privateKey;

    if (!privateKey) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Missing Private Key',
        message: 'Please set your private key in the extension preferences.',
      });
      return undefined;
    }

    return privateKey;
  } catch (error) {
    console.error('Error loading the private key:', error);
    showFailureToast(error, { title: 'Failed to Load Private Key' });

    return undefined;
  }
}

export function loadRelayURLs(): string[] {
  const defaultRelays = ['wss://relay.nostr.band'];

  try {
    const preferences = getPreferenceValues<Preferences>();
    const relays = preferences.relays;

    if (relays) {
      return relays.split(',').map((relay) => relay.trim());
    }

    return defaultRelays;
  } catch (error) {
    console.error('Error loading relay URLs:', error);
    showFailureToast(error, { title: 'Failed to Load Relays' });

    return defaultRelays;
  }
}
