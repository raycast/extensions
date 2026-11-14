import { LocalStorage, environment, LaunchType, launchCommand } from "@raycast/api";
import type { NetworkServiceStatus } from "./network-services";

const VPN_STATUS_KEY = "vpn-connection-status";
const MENUBAR_REFRESH_TIMESTAMP_KEY = "vpn-menubar-refresh-timestamp";

export type VpnStatusUpdate = {
  serviceId: string;
  status: NetworkServiceStatus;
  timestamp: number;
};

/**
 * Updates the VPN status in shared storage
 */
export async function updateVpnStatus(update: VpnStatusUpdate): Promise<void> {
  try {
    await LocalStorage.setItem(VPN_STATUS_KEY, JSON.stringify(update));
    // A menu bar refresh must never trigger another refresh of itself.
    if (environment.entryPointName === "menu-bar") return;
    await updateMenuBarRefreshTimestamp();
    await forceMenuBarRefresh();
  } catch (error) {
    // The network request already succeeded. A refresh failure must not invite a retry.
    console.error("Unable to share VPN status:", error);
  }
}

/**
 * Gets the latest VPN status from shared storage
 */
export async function getVpnStatus(): Promise<VpnStatusUpdate | null> {
  const status = await LocalStorage.getItem<string>(VPN_STATUS_KEY);
  if (!status) return null;
  try {
    const value: unknown = JSON.parse(status);
    if (
      typeof value !== "object" ||
      value === null ||
      !("serviceId" in value) ||
      !("status" in value) ||
      !("timestamp" in value)
    )
      return null;
    if (typeof value.serviceId !== "string" || typeof value.timestamp !== "number" || !Number.isFinite(value.timestamp))
      return null;
    const state = value.status;
    if (
      state !== "connected" &&
      state !== "disconnected" &&
      state !== "connecting" &&
      state !== "disconnecting" &&
      state !== "invalid"
    )
      return null;
    return { serviceId: value.serviceId, status: state, timestamp: value.timestamp };
  } catch {
    return null;
  }
}

/**
 * Updates the menubar refresh timestamp
 * This is used as a direct signal to the menubar to refresh
 */
export async function updateMenuBarRefreshTimestamp(): Promise<void> {
  await LocalStorage.setItem(MENUBAR_REFRESH_TIMESTAMP_KEY, Date.now().toString());
}

/**
 * Gets the last menubar refresh timestamp
 */
export async function getMenuBarRefreshTimestamp(): Promise<number> {
  const timestamp = await LocalStorage.getItem<string>(MENUBAR_REFRESH_TIMESTAMP_KEY);
  const value = Number(timestamp);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Force refreshes the menubar by relaunching the menubar command
 * This is the most direct way to update the menubar icon
 */
export async function forceMenuBarRefresh(): Promise<void> {
  try {
    console.log("Forcing menubar refresh by relaunching command");
    // Launch the menubar command in background mode
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
    console.log("Menubar command relaunched");
  } catch (error) {
    console.error("Failed to relaunch menubar command:", error);
  }
}
