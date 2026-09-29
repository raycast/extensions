import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getNordLynxStatus, getPublicLocation, runNordVPNCommand, waitForDisconnect } from "./utils/nordvpn";

type ExtensionPreferences = {
  nordVpnExecutablePath: string;
};

export default async function DisconnectCommand() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Disconnecting from NordVPN…" });

  try {
    const { nordVpnExecutablePath } = getPreferenceValues<ExtensionPreferences>();
    const executablePath = nordVpnExecutablePath.trim();
    if (!executablePath) {
      throw new Error("Set the NordVPN executable path in the extension preferences.");
    }

    const [adapterStatus, currentLocation] = await Promise.all([getNordLynxStatus(), getPublicLocation()]);
    if (adapterStatus === "Disconnected") {
      toast.style = Toast.Style.Success;
      toast.title = "Already disconnected from NordVPN";
      toast.message = `${currentLocation.country} — ${currentLocation.ip}`;
      return;
    }
    if (adapterStatus !== "Up") {
      throw new Error(`Cannot confirm VPN state: NordLynx adapter is ${adapterStatus}.`);
    }

    await runNordVPNCommand(executablePath, ["--disconnect"]);
    const disconnectedLocation = await waitForDisconnect(adapterStatus, currentLocation);

    toast.style = Toast.Style.Success;
    toast.title = "Disconnected from NordVPN";
    toast.message = `${disconnectedLocation.country} — ${disconnectedLocation.ip}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "NordVPN disconnection failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
