import { getVPNStatusByName } from "./getVPN";
import { CMD_PATH, runScriptSilently, SHELL_PATH } from "./utils";

export default async (VPNName: string) => {
  const isConnected = await getVPNStatusByName(VPNName);
  if (isConnected) {
    await disconnectVPNByName(VPNName);
  } else {
    await connectVPNByName(VPNName);
  }

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

export async function disconnectVPNByName(VPNName: string) {
  const DISCONNECT_VPN = `${CMD_PATH} --nc stop "${VPNName}"`;
  await runScriptSilently(DISCONNECT_VPN);
}

export async function connectVPNByName(VPNName: string) {
  const CONNECT_VPN = `${CMD_PATH} --nc start "${VPNName}"`;
  await runScriptSilently(CONNECT_VPN);
}
