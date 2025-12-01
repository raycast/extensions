import type { ProviderConfig } from "../lib/types";
import { getProviders } from "../lib/store";

/**
 * Tool that returns the list of supported music providers for this extension.
 *
 * This tool returns the providers stored in LocalStorage, which defaults to
 * 12 providers: Amazon Music, Amazon Store, Anghami, Deezer, Apple Music,
 * iTunes, SoundCloud, Tidal, Yandex Music, YouTube, YouTube Music, and Spotify.
 *
 * @returns {ProviderConfig[]} Array of provider configurations from LocalStorage
 */
export default async function tool(): Promise<ProviderConfig[]> {
  return await getProviders();
}
