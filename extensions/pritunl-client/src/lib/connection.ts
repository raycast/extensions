import { Alert, Color, confirmAlert, Icon, open, showToast, Toast } from "@raycast/api";
import { displayName } from "./format";
import { connect, disconnect, isAppRunning, removeProfile, setAutostart, waitForConnection } from "./pritunl";
import { Profile } from "./types";

const CONNECT_TIMEOUT_MS = 30_000;
// Leaves time to finish signing in through the browser.
const SSO_TIMEOUT_MS = 120_000;
const DISCONNECT_TIMEOUT_MS = 10_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function connectProfile(profile: Profile): Promise<void> {
  const name = displayName(profile);
  const toast = await showToast({ style: Toast.Style.Animated, title: `Connecting to ${name}` });

  try {
    const { ssoUrl } = await connect(profile.id);
    if (ssoUrl) {
      if (!(await isAppRunning())) await open(ssoUrl);
      toast.message = "Finish signing in through your browser";
      // In case the app was open but didn't show the page.
      toast.primaryAction = { title: "Open Sign-In Page", onAction: () => open(ssoUrl) };
    }

    const connected = await waitForConnection(profile.id, true, ssoUrl ? SSO_TIMEOUT_MS : CONNECT_TIMEOUT_MS);
    toast.primaryAction = undefined;
    if (connected && !connected.connected) {
      // Cancelled. Whatever stopped it shows its own message.
      await toast.hide();
    } else if (connected) {
      toast.style = Toast.Style.Success;
      toast.title = `Connected to ${name}`;
      toast.message = connected.client_address;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Couldn't connect to ${name}`;
      toast.message = "Timed out. The logs might say why.";
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn't connect to ${name}`;
    toast.message = errorMessage(error);
  }
}

export async function disconnectProfile(profile: Profile): Promise<void> {
  const name = displayName(profile);
  const toast = await showToast({ style: Toast.Style.Animated, title: `Disconnecting from ${name}` });

  try {
    await disconnect(profile.id);
    await waitForConnection(profile.id, false, DISCONNECT_TIMEOUT_MS);
    toast.style = Toast.Style.Success;
    toast.title = `Disconnected from ${name}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn't disconnect from ${name}`;
    toast.message = errorMessage(error);
  }
}

export async function toggleConnection(profile: Profile): Promise<void> {
  // A profile that is still connecting counts as up, so the action cancels it.
  if (profile.connected || profile.run_state === "Active") {
    await disconnectProfile(profile);
  } else {
    await connectProfile(profile);
  }
}

export async function toggleAutostart(profile: Profile): Promise<void> {
  const enable = profile.state !== "Enabled";

  try {
    await setAutostart(profile.id, enable);
    await showToast({ style: Toast.Style.Success, title: enable ? "Autostart on" : "Autostart off" });
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: "Couldn't change autostart", message: errorMessage(error) });
  }
}

/** Asks first, since getting the profile back means importing it again. Returns whether it was removed. */
export async function confirmRemoveProfile(profile: Profile): Promise<boolean> {
  const name = displayName(profile);
  const running = profile.connected || profile.run_state === "Active";
  const confirmed = await confirmAlert({
    icon: { source: Icon.Trash, tintColor: Color.Red },
    title: `Remove ${name}?`,
    // Kept to two short lines, since the dialog is narrow.
    message: running
      ? `It's ${profile.connected ? "connected" : "connecting"} and will be disconnected first. You'll need its profile link or file to add it again.`
      : "You'll need its profile link or file to add it again.",
    primaryAction: { title: "Remove Profile", style: Alert.ActionStyle.Destructive },
    dismissAction: { title: "Keep" },
  });
  if (!confirmed) return false;

  const toast = await showToast({ style: Toast.Style.Animated, title: `Removing ${name}` });
  try {
    if (running) {
      toast.message = "Disconnecting";
      await disconnect(profile.id);
      if (!(await waitForConnection(profile.id, false, DISCONNECT_TIMEOUT_MS))) {
        throw new Error("It didn't disconnect, so it was left in place");
      }
    }
    toast.message = undefined;
    await removeProfile(profile.id);
    toast.style = Toast.Style.Success;
    toast.title = `Removed ${name}`;
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn't remove ${name}`;
    toast.message = errorMessage(error);
    return false;
  }
}
