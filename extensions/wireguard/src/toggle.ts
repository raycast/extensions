import { showHUD, showToast, Toast } from "@raycast/api";
import { VPN } from "./type";
import { CMD_PATH, runScript } from "./utils";

export default async (VPN: VPN) => {
  await showToast(Toast.Style.Animated, VPN.isConnected ? "Disconnecting" : "Connecting");
  const sn = VPN.sn;
  if (VPN.isConnected) {
    await disconnectVPNBySN(sn, true);
  } else {
    await connectVPNBySN(sn, true);
  }

  await showHUD(`${VPN.name} is ${VPN.isConnected ? "DISCONNECTED" : "CONNECTED"}`);
  /*
    setTimeout(async ()=> {
        console.log("trigger notification");
        const VPNStatus = await getVPNStatusByName(VPNName);
        if (VPNStatus) {
            showNotification(VPNName + " is CONNECTED.");
        } else {
            showNotification(VPNName + " is DISCONNECTED.");
        }
    }, 1000);
    */
};

export async function disconnectVPNBySN(sn: string, isSilently = false) {
  // const ConvertedName = VPNName?.replace(/"/g, '\\"')?.replace(/`/g, "\\`");
  const DISCONNECT_VPN = `${CMD_PATH} --nc stop "${sn}"`;
  await runScript(DISCONNECT_VPN, isSilently);
}

export async function connectVPNBySN(sn: string, isSilently = false) {
  // const ConvertedName = VPNName?.replace(/"/g, '\\"')?.replace(/`/g, "\\`");
  const CONNECT_VPN = `${CMD_PATH} --nc start "${sn}"`;
  await runScript(CONNECT_VPN, isSilently);
}
