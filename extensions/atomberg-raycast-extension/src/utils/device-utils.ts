import type { Device, DevicesByRoom } from "../types";

/**
 * Groups devices by their room assignment for organized display
 *
 * This function takes a flat array of devices and organizes them into
 * a room-based structure. Devices without a room are grouped under "Unknown Room".
 *
 * @param devices - Array of devices to group by room
 * @returns Object with room names as keys and arrays of devices as values
 */
export function groupDevicesByRoom(devices: Device[]): DevicesByRoom {
  return devices.reduce((acc, device) => {
    const room = device.room || "Unknown Room";
    if (!acc[room]) {
      acc[room] = [];
    }
    acc[room].push(device);
    return acc;
  }, {} as DevicesByRoom);
}

/**
 * Gets a sorted list of room names from grouped devices
 *
 * @param devicesByRoom - Object containing devices grouped by room
 * @returns Alphabetically sorted array of room names
 */
export function getSortedRooms(devicesByRoom: DevicesByRoom): string[] {
  return Object.keys(devicesByRoom).sort();
}

/**
 * Validates API credentials for authentication
 *
 * Checks if both API key and refresh token are provided and not empty
 * after trimming whitespace.
 *
 * @param apiKey - API key string to validate
 * @param refreshToken - Refresh token string to validate
 * @returns true if both credentials are valid, false otherwise
 */
export function hasValidCredentials(apiKey?: string, refreshToken?: string): boolean {
  return Boolean(apiKey?.trim() && refreshToken?.trim());
}
