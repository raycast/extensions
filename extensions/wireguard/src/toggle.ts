import { getVPNStatusByName } from "./getVPN";
import { runScriptSilently, SHELL_PATH } from "./utils";

export default async (VPNName: string) => {
  const CONNECT_VPN = `${SHELL_PATH}scutil --nc start "${VPNName}"`;
  const DISCONNECT_VPN = `${SHELL_PATH}scutil --nc stop "${VPNName}"`;

  const isConnected = await getVPNStatusByName(VPNName);
  if (isConnected) {
    await runScriptSilently(DISCONNECT_VPN);
  } else {
    await runScriptSilently(CONNECT_VPN);
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
