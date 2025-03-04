import { LocalStorage } from "@raycast/api";
import { getStatus } from "../api";

interface SnoozeState {
  endTime: string | null; // ISO string of when protection will be re-enabled
}

export async function getDisabledState(): Promise<SnoozeState | null> {
  try {
    // Get status from AdGuard
    const status = await getStatus();

    if (status.protection_disabled_until) {
      // Use AdGuard's native disabled until time
      return { endTime: status.protection_disabled_until };
    }

    // Not disabled
    return null;
  } catch (error) {
    console.error("Failed to get protection state:", error);
    return null;
  }
}

export async function saveDisabledState(endTime: Date | null) {
  // Still save locally for immediate UI updates
  await LocalStorage.setItem("disabledState", endTime ? JSON.stringify({ endTime: endTime.toISOString() }) : "");
}
