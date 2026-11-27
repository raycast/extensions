import { getPreferenceValues } from "@raycast/api";
import { CREATE_API_KEY_URL } from "./qrdx-api";

/** The QRdx API key from the extension's preferences, or undefined. */
export function apiKey(): string | undefined {
  const { apiKey: key } = getPreferenceValues<Preferences>();
  return key?.trim() || undefined;
}

/** What the AI tools answer without a key. */
export const NO_API_KEY_MESSAGE = `Dynamic codes need a QRdx API key. Create one in QRdx under Settings → API keys & apps (${CREATE_API_KEY_URL}), then paste it into the QRdx extension's preferences in Raycast.`;

/** The key, or an error the AI tools pass on. */
export function requireApiKey(): string {
  const key = apiKey();
  if (!key) throw new Error(NO_API_KEY_MESSAGE);
  return key;
}
