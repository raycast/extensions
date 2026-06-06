import { LocalStorage } from "@raycast/api";
import { Credentials } from "@bharper/atv-js";
import { NotPairedError } from "./errors";

// Pairing credentials are machine-generated key material (not user-entered
// secrets), so they live in Raycast's encrypted LocalStorage database rather
// than extension preferences. Keychain access is intentionally not used.
const credsKey = (deviceId: string) => `atv:creds:${deviceId}`;

export async function saveCredentials(deviceId: string, creds: Credentials): Promise<void> {
  await LocalStorage.setItem(credsKey(deviceId), JSON.stringify(creds));
}

export async function loadCredentials(deviceId: string): Promise<Credentials> {
  const raw = await LocalStorage.getItem<string>(credsKey(deviceId));
  if (!raw) {
    throw new NotPairedError();
  }
  return JSON.parse(raw) as Credentials;
}
