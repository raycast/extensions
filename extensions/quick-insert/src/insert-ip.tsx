import { showHUD, Clipboard, confirmAlert, Alert } from "@raycast/api";
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

async function getPublicIP(): Promise<string> {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = (await response.json()) as { ip: string };
    return data.ip;
  } catch (error) {
    throw new Error("Failed to fetch public IP");
  }
}

export default async function InsertIP(props: { arguments: Arguments }) {
  try {
    let ip = "";

    switch (props.arguments.type) {
      case "local":
        ip = await getLocalIP();
        break;
      case "public": {
        const confirmed = await confirmAlert({
          title: "Cảnh báo",
          message:
            "Hành động này sẽ gửi request lên dịch vụ bên ngoài (api.ipify.org) để lấy địa chỉ IP công khai của bạn.",
          primaryAction: {
            title: "Tiếp tục",
            style: Alert.ActionStyle.Default,
          },
          dismissAction: {
            title: "Hủy",
            style: Alert.ActionStyle.Cancel,
          },
        });

        if (!confirmed) {
          await showHUD("❌ Đã hủy");
          return;
        }

        ip = await getPublicIP();
        break;
      }
      case "both": {
        const confirmed = await confirmAlert({
          title: "Cảnh báo",
          message:
            "Hành động này sẽ gửi request lên dịch vụ bên ngoài (api.ipify.org) để lấy địa chỉ IP công khai của bạn.",
          primaryAction: {
            title: "Tiếp tục",
            style: Alert.ActionStyle.Default,
          },
          dismissAction: {
            title: "Hủy",
            style: Alert.ActionStyle.Cancel,
          },
        });

        if (!confirmed) {
          await showHUD("❌ Đã hủy");
          return;
        }

        const localIP = await getLocalIP();
        const publicIP = await getPublicIP();
        ip = `Local: ${localIP}\nPublic: ${publicIP}`;
        break;
      }
      default:
        ip = await getLocalIP();
    }

    await Clipboard.paste(ip);
    await showHUD(`✅ Inserted IP: ${ip}`);
  } catch (error) {
    await showHUD(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
