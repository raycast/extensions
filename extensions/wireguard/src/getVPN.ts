import { VPN } from "./type";
import { CMD_PATH, getFlagByName, runScript } from "./utils";

export default async () => {
  const GET_VPN_NAMES = `${CMD_PATH} --nc list | grep "com.wireguard.macos"`;
  // Regular matching text:
  // * (Connected)      xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx VPN (com.wireguard.macos) "Home"                      [VPN:com.wireguard.macos]
  const REG_VPN = /\* (\(\w+\))\s+([\w-]+?)\s+VPN\s+\(.*?"(.*?)"?\s+\[VPN:/gm;
  const VPNItems: VPN[] = [];
  const cmdResult = await runScript(GET_VPN_NAMES);
  let execString = REG_VPN.exec(cmdResult);
  while (execString !== null) {
    const isConnected = execString[1] === "(Connected)" ? true : false;
    const sn = execString[2];
    const VPNName = execString[3];
    const VPNItem: VPN = { name: VPNName, sn: sn, isConnected: isConnected, flag: getFlagByName(VPNName) };
    VPNItems.push(VPNItem);
    execString = REG_VPN.exec(cmdResult);
  }
  return VPNItems;
};

/* export async function getVPNStatusByName(VPNName: string) {
 *   let isConnected = false;
 *   if (VPNName?.length > 0) {
 *     const GET_VPN_STATUS = `${CMD_PATH} --nc status "${VPNName}" | head -n 1`;
 *     const VPNStatus: string = await runScript(GET_VPN_STATUS);
 *     if (VPNStatus === "Connected") {
 *       isConnected = true;
 *     }
 *   }
 *   return isConnected;
 * } */

export async function getConnectedVPNSNArray() {
  // const GET_CONNECTED_VPN = `${CMD_PATH} --nc list | grep "com.wireguard.macos" | grep "(Connected)"`;
  const GET_CONNECTED_VPN = `${CMD_PATH} --nc list | grep "com.wireguard.macos"`;
  // const REG_VPN = /\*\s+\(Connected\).*?\).*?"(.*?)"?\s+\[VPN:/gm;
  const REG_VPN = /\* \(Connected\)\s+([\w-]+?)\s+VPN\s+\(.*?"(.*?)"?\s+\[VPN:/gm;
  const snArray: string[] = [];
  const cmdResult = await runScript(GET_CONNECTED_VPN);
  if (cmdResult !== "") {
    let execString = REG_VPN.exec(cmdResult);
    while (execString !== null) {
      snArray.push(execString[1]);
      execString = REG_VPN.exec(cmdResult);
    }
  }
  return snArray;
}
