import { getPreferenceValues, showToast, Toast } from '@raycast/api';
import { showFailureToast } from '@raycast/utils';
import { nip19 } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

type Preferences = {
  privateKey: string;
  relays?: string;
  includeClient: boolean;
};

const preferences = getPreferenceValues<Preferences>();

export const includeClient: boolean = preferences.includeClient;

export function decodePrivateKey(privateKey: string): string {
  if (privateKey.startsWith('nsec')) {
    const { type, data } = nip19.decode(privateKey);
    if (type === 'nsec') {
      return bytesToHex(data);
    } else {
      throw new Error('Invalid nsec key');
    }
  }
  return privateKey;
}

export function loadPrivateKey(): string | undefined {
  try {
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
