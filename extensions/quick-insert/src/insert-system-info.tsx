import { showHUD, Clipboard } from "@raycast/api";
import os from "os";

interface Arguments {
  type: string;
}

async function getLocalIP(): Promise<string> {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaces = interfaces[name];
    if (!ifaces) continue;

    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "N/A";
}

export default async function InsertSystemInfo(props: { arguments: Arguments }) {
  try {
    let info = "";

    switch (props.arguments.type) {
      case "os":
        info = `${os.platform()} ${os.release()}`;
        break;
      case "username":
        info = os.userInfo().username;
        break;
      case "hostname":
        info = os.hostname();
        break;
      case "local-ip":
        info = await getLocalIP();
        break;
      case "all": {
        const localIP = await getLocalIP();
        info = `OS: ${os.platform()} ${os.release()}\nUsername: ${os.userInfo().username}\nHostname: ${os.hostname()}\nLocal IP: ${localIP}`;
        break;
      }
      default:
        info = "Unknown type";
    }

    await Clipboard.paste(info);
    await showHUD(`✅ Inserted system info`);
  } catch (error) {
    await showHUD(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
