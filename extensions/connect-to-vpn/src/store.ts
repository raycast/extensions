import { LocalStorage, environment, LaunchType, launchCommand } from "@raycast/api";

const VPN_STATUS_KEY = "vpn-connection-status";
const MENUBAR_REFRESH_TIMESTAMP_KEY = "vpn-menubar-refresh-timestamp";

export type VpnStatusUpdate = {
  serviceId: string;
  status: "connected" | "disconnected" | "connecting" | "disconnecting" | "invalid";
  timestamp: number;
};

/**
 * Updates the VPN status in shared storage
 */
export async function updateVpnStatus(update: VpnStatusUpdate): Promise<void> {
  await LocalStorage.setItem(VPN_STATUS_KEY, JSON.stringify(update));

  // The menu bar polls this timestamp and refreshes every service when it changes, and each of
  // those refreshes reports a status update of its own. Signalling from inside the menu bar would
  // therefore never stop, and a command cannot launch itself either, so only the other commands
  // signal. launchType would not do as the test here: it says how the command started, and opening
  // the menu bar is a user launch rather than a background one.
  if (environment.entryPointName === "menu-bar") return;

  await updateMenuBarRefreshTimestamp();
  await forceMenuBarRefresh();
}

/**
 * Gets the latest VPN status from shared storage
 */
export async function getVpnStatus(): Promise<VpnStatusUpdate | null> {
  const status = await LocalStorage.getItem<string>(VPN_STATUS_KEY);
  return status ? JSON.parse(status) : null;
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
  return timestamp ? parseInt(timestamp, 10) : 0;
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
