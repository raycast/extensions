import { LocalStorage } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";

const USER_ID_KEY = "daily-poll-user-id";

/**
 * Gets or generates a UUID for this device and stores it locally
 */
async function getDeviceUuid(): Promise<string> {
  const stored = await LocalStorage.getItem<string>(USER_ID_KEY);

  if (stored) {
    return stored;
  }

  // Generate a new UUID
  const newUserId = uuidv4();
  await LocalStorage.setItem(USER_ID_KEY, newUserId);
  return newUserId;
}

/**
 * Returns the SHA-256 hash of the device UUID for anonymous identification
 * The backend never sees the raw UUID, only the hash
 */
export async function getUserHash(): Promise<string> {
  const uuid = await getDeviceUuid();
  return createHash("sha256").update(uuid).digest("hex");
}
