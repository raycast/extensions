import { VPN } from "./type";
import { CMD_PATH, getFlagByName, getFlagEmoji, runScript, runScriptReturnArray } from "./utils";

export default async () => {
  const GET_VPN_NAMES = `${CMD_PATH} --nc list | grep "com.wireguard.macos"`;
  // Regular matching text:
  // * (Connected)      xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx VPN (com.wireguard.macos) "Home"                      [VPN:com.wireguard.macos]
  const REG_VPN = /\* (\(\w+\)).*?"(.*)"/gm;
  const VPNItems: VPN[] = [];
  const cmdResult = await runScript(GET_VPN_NAMES);
  let execString = REG_VPN.exec(cmdResult);
  while (execString !== null) {
    const isConnected = execString[1] === "(Connected)" ? true : false;
    const VPNName = execString[2];
    const VPNItem: VPN = { name: VPNName, isConnected: isConnected, flag: getFlagByName(VPNName) };
    VPNItems.push(VPNItem);
    execString = REG_VPN.exec(cmdResult);
  }
  return VPNItems;
};

export async function getVPNStatusByName(VPNName: string) {
  let isConnected = false;
  if (VPNName?.length > 0) {
    const GET_VPN_STATUS = `${CMD_PATH} --nc status "${VPNName}" | head -n 1`;
    const VPNStatus: string = await runScript(GET_VPN_STATUS);
    if (VPNStatus === "Connected") {
      isConnected = true;
    }
  }
  return isConnected;
}

export async function getConnectedVPNArray() {
  const GET_CONNECTED_VPN = `${CMD_PATH} --nc list | grep "com.wireguard.macos" | grep "(Connected)" | awk -F '"' '{print$2}'`;
  const VPNNameArray = await runScriptReturnArray(GET_CONNECTED_VPN);
  return VPNNameArray;
}
