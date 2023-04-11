import { VPN } from "./type";
import { CMD_PATH, runScript, SHELL_PATH } from "./utils";

export default async () => {
  const GET_VPN_NAMES = `${SHELL_PATH}scutil --nc list | grep "com.wireguard.macos" | awk -F'"' '{print$2}'`;
  const VPNItems: VPN[] = [];
  const VPNList: string = await runScript(GET_VPN_NAMES);
  if (VPNList === "") {
    return [];
  }
  const VPNArray = VPNList.split(/\r?\n/);
  if (VPNArray.length > 0) {
    for (const VPNName of VPNArray) {
      const isConnected = await getVPNStatusByName(VPNName);
      const VPNItem: VPN = { name: VPNName, isConnected: isConnected };
      VPNItems.push(VPNItem);
    }
  }
  return VPNItems;
};

export async function getVPNStatusByName(VPNName: string) {
  let isConnected = false;
  if (VPNName?.length > 0) {
    const GET_VPN_STATUS = `${SHELL_PATH}scutil --nc status "${VPNName}" | head -n 1 | grep -i "connected"`;
    const VPNStatus: string = await runScript(GET_VPN_STATUS);
    //console.log("VPNStatus -> >" + VPNStatus + "<");
    if (VPNStatus === "Connected") {
      isConnected = true;
    }
  }
  return isConnected;
}

export async function getConnectedVPN() {
  const GET_CONNECTED_VPN = `${CMD_PATH} --nc list | grep "com.wireguard.macos" | grep "(Connected)" | awk -F '"' '{print$2}'`;
  const VPNName = await runScript(GET_CONNECTED_VPN);
  return VPNName;
}
