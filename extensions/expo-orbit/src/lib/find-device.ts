import { Device, listDevices } from "./devices";

/**
 * Finds a device by its ID (UDID or AVD name) or its exact name, as the AI may pass either. Only a single exact match
 * counts, so the device a confirmation shows is always the one the tool then acts on.
 */
export async function findDevice(query: string): Promise<Device> {
  const { devices } = await listDevices();
  const needle = query.trim().toLowerCase();
  const byId = devices.find((device) => device.id.toLowerCase() === needle);
  if (byId) return byId;

  const name = needle.replace(/_/g, " ");
  const byName = devices.filter((device) => device.name.toLowerCase() === name);
  if (byName.length > 1) {
    throw new Error(`Several devices are named "${query}". Pass the device's id from get-devices instead.`);
  }
  if (byName.length === 0) {
    throw new Error(`No device matches "${query}". Use get-devices to list the available devices.`);
  }
  return byName[0];
}
