import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getNordLynxStatus, getPublicLocation, runNordVPNCommand, waitForConnection } from "./utils/nordvpn";

type ExtensionPreferences = {
  nordVpnExecutablePath: string;
};

export default async function QuickConnectCommand() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting to NordVPN…" });

  try {
    const { nordVpnExecutablePath } = getPreferenceValues<ExtensionPreferences>();
    const executablePath = nordVpnExecutablePath.trim();
    if (!executablePath) {
      throw new Error("Set the NordVPN executable path in the extension preferences.");
    }

    const [adapterStatus, currentLocation] = await Promise.all([getNordLynxStatus(), getPublicLocation()]);
    if (adapterStatus === "Up") {
      toast.style = Toast.Style.Success;
      toast.title = "Already connected to NordVPN";
      toast.message = `${currentLocation.country} — ${currentLocation.ip}`;
      return;
    }

    await runNordVPNCommand(executablePath, ["--connect"]);
    const connectedLocation = await waitForConnection(currentLocation.ip);

    toast.style = Toast.Style.Success;
    toast.title = "Connected to NordVPN";
    toast.message = `${connectedLocation.country} — ${connectedLocation.ip}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "NordVPN connection failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
