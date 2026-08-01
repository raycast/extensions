import { getPreferenceValues } from "@raycast/api";
import { parseSecretKey } from "./nostr";
import { normalizeRelayUrl } from "./relay-url";
import { BuzzClient } from "./buzz-client";

interface RawPreferences {
  relayUrl: string;
  privateKey: string;
}

export interface BuzzConfig {
  relayUrl: string;
  secretKey: Uint8Array;
}

/**
 * Read and validate extension preferences. Throws a user-facing error (safe to
 * show in a toast or view) when the relay URL or private key is missing or
 * malformed. The private key is never included in any thrown message.
 */
export function getBuzzConfig(): BuzzConfig {
  const { relayUrl, privateKey } = getPreferenceValues<RawPreferences>();
  const url = normalizeRelayUrl(relayUrl ?? "");
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Set your Buzz relay URL (https:// or wss://) in extension preferences");
  }
  const secretKey = parseSecretKey(privateKey ?? "");
  return { relayUrl: url, secretKey };
}

export function getClient(): BuzzClient {
  const { relayUrl, secretKey } = getBuzzConfig();
  return new BuzzClient(relayUrl, secretKey);
}
