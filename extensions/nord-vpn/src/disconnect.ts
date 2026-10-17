import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getNordLynxStatus, runNordVPNCommand, waitForDisconnect } from "./utils/nordvpn";

export default async function DisconnectCommand() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Disconnecting from NordVPN…" });

  try {
    const { nordVpnExecutablePath } = getPreferenceValues<Preferences.Disconnect>();
    const executablePath = nordVpnExecutablePath.trim();
    if (!executablePath) {
      throw new Error("Set the NordVPN executable path in the extension preferences.");
    }

    const adapterStatus = await getNordLynxStatus();
    if (adapterStatus === "Disconnected") {
      toast.style = Toast.Style.Success;
      toast.title = "Already disconnected from NordVPN";
      return;
    }
    if (adapterStatus !== "Up") {
      throw new Error(`Cannot confirm VPN state: NordLynx adapter is ${adapterStatus}.`);
    }

    await runNordVPNCommand(executablePath, ["--disconnect"]);
    const disconnectedLocation = await waitForDisconnect(adapterStatus);

    toast.style = Toast.Style.Success;
    toast.title = "Disconnected from NordVPN";
    if (disconnectedLocation) {
      toast.message = `${disconnectedLocation.country} — ${disconnectedLocation.ip}`;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "NordVPN disconnection failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
