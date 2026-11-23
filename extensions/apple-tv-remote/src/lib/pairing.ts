import { LocalStorage } from "@raycast/api";
import { AppleTVDevice, Credentials } from "@bharper/atv-js";
import { NotPairedError } from "./errors";

// The paired device and its credentials (machine-generated key material, not
// a user secret) live in Raycast's encrypted LocalStorage. Credentials are
// keyed by the identifier the device had when it was paired.
const DEVICE_KEY = "atv:device:selected";
const credentialsKey = (identifier: string) => `atv:creds:${identifier}`;

async function read<T>(key: string): Promise<T | null> {
  const raw = await LocalStorage.getItem<string>(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

const write = (key: string, value: unknown) => LocalStorage.setItem(key, JSON.stringify(value));

export async function loadDevice(): Promise<AppleTVDevice | null> {
  return read<AppleTVDevice>(DEVICE_KEY);
}

/** Persist the device record, e.g. after its address or port changed. */
export async function saveDevice(device: AppleTVDevice): Promise<void> {
  await write(DEVICE_KEY, device);
}

export async function loadPairing(): Promise<{ device: AppleTVDevice; credentials: Credentials }> {
  const device = await loadDevice();
  const credentials = device && (await read<Credentials>(credentialsKey(device.identifier)));
  if (!device || !credentials) throw new NotPairedError();
  return { device, credentials };
}

export async function savePairing(device: AppleTVDevice, credentials: Credentials): Promise<void> {
  await write(credentialsKey(device.identifier), credentials);
  await saveDevice(device);
}
