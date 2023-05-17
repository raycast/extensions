import { showHUD, Clipboard } from "@raycast/api";
import os from "os";

function getLocalIPv4() {
  const interfaces = os.networkInterfaces();
  for (let ifaceName in interfaces) {
    const iface = interfaces[ifaceName];
    for (let i = 0; i < iface!.length; i++) {
      const { address, family, internal } = iface![i];
      if (family === 'IPv4' && !internal) {
        return address;
      }
    }
  }
  return null;
}




export default async function main() {
  const localIPv4 = getLocalIPv4();
  if(!localIPv4) {
    await showHUD("Couldn't parse IPv4 Address")
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await Clipboard.copy(localIPv4!);
  await showHUD(`Copied IPv4 address ${localIPv4} to clipboard`);
}
