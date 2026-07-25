import { getPreferenceValues } from "@raycast/api";
import { listBackupsForDevice } from "./db";
import { resolveDeviceName } from "./naming";
import { StoredBackup, Preferences } from "./types";

/** List the backups stored for this device in Neon, newest first. */
export async function listDeviceBackups(): Promise<StoredBackup[]> {
  const prefs = getPreferenceValues<Preferences>();
  const deviceName = resolveDeviceName(prefs.deviceName);
  return listBackupsForDevice(deviceName);
}
