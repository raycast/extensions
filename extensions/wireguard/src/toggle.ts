import { VPN } from "./type";
import { CMD_PATH, runScript } from "./utils";

export default async (VPN: VPN) => {
  const VPNName = VPN.name;
  if (VPN.isConnected) {
    await disconnectVPNByName(VPNName, true);
  } else {
    await connectVPNByName(VPNName, true);
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

export async function disconnectVPNByName(VPNName: string, isSilently = false) {
  const DISCONNECT_VPN = `${CMD_PATH} --nc stop "${VPNName}"`;
  await runScript(DISCONNECT_VPN, isSilently);
}

export async function connectVPNByName(VPNName: string, isSilently = false) {
  const CONNECT_VPN = `${CMD_PATH} --nc start "${VPNName}"`;
  await runScript(CONNECT_VPN, isSilently);
}
