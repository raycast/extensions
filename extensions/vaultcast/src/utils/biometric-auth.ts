import { authenticateDeviceOwner, canAuthenticateDeviceOwner } from "swift:../../swift";

const isDarwin = process.platform === "darwin";

export async function isTouchIdAvailable(): Promise<boolean> {
  if (!isDarwin) {
    return false;
  }

  try {
    return await canAuthenticateDeviceOwner();
  } catch {
    return false;
  }
}

/** Asks for Touch ID / Apple Watch / device password. Any failure or cancellation counts as not confirmed. */
export async function confirmPresence(): Promise<boolean> {
  if (!isDarwin) {
    return false;
  }

  try {
    return await authenticateDeviceOwner("unlock your password manager");
  } catch {
    return false;
  }
}
