import { showHUD } from "@raycast/api";
import { getCachedEnv } from "./shell-utils";
import { execSync } from "child_process";
import os from "os";

export const getCurWifiInfo = async () => {
  try {
    const execEnv = await getCachedEnv();
    const out = execSync(
      `networksetup -listnetworkserviceorder | sed -n '/Wi-Fi/s|.*Device: \\(.*\\)).*|\\1|p'`,
      execEnv,
    );
    const device = String(out).trim();
    const out2 = execSync(`networksetup -getairportnetwork ${device}`, execEnv);
    const network = String(out2).trim();
    if (network.includes("off")) {
      return [];
    } else {
      const out3 = execSync(`networksetup -getinfo Wi-Fi`, execEnv);
      const lines = String(out3).trim().split("\n");
      return lines
        .slice(1)
        .map((line) => {
          const index = line.indexOf(":");
          if (index === -1) return null;

          const key = line.substring(0, index).trim();
          const value = line.substring(index + 1).trim();

          if (value === "") return null;

          return { key, value };
        })
        .filter((item) => item !== null);
    }
  } catch (e) {
    console.log(e);
    return [];
  }
};

export const getCurWifiName = async () => {
  try {
    const execEnv = await getCachedEnv();
    const out = execSync(
      `networksetup -listnetworkserviceorder | sed -n '/Wi-Fi/s|.*Device: \\(.*\\)).*|\\1|p'`,
      execEnv,
    );
    const device = String(out).trim();
    const out2 = execSync(`networksetup -getairportnetwork ${device}`, execEnv);
    const network = String(out2).trim();
    if (network.includes("off")) {
      return "";
    } else {
      const index = network.indexOf(": ");
      if (index === -1) return "";
      return network.substring(index + 2);
    }
  } catch (e) {
    return "";
  }
};

export const getCurWifiStatus = async () => {
  try {
    const execEnv = await getCachedEnv();
    const out = execSync(
      `networksetup -listnetworkserviceorder | sed -n '/Wi-Fi/s|.*Device: \\(.*\\)).*|\\1|p'`,
      execEnv,
    );
    const device = String(out).trim();
    const out2 = execSync(`networksetup -getairportnetwork ${device}`, execEnv);
    const network = String(out2).trim();
    return !network.includes("off");
  } catch (e) {
    return false;
  }
};

export const toggleWifi = async () => {
  try {
    const execEnv = await getCachedEnv();
    const out = execSync(
      `networksetup -listnetworkserviceorder | sed -n '/Wi-Fi/s|.*Device: \\(.*\\)).*|\\1|p'`,
      execEnv,
    );
    const device = String(out).trim();
    const out2 = execSync(`networksetup -getairportnetwork ${device}`, execEnv);
    const network = String(out2).trim();
    if (network.includes("off")) {
      await showHUD("🛜 Wi-Fi turned on");
      execSync(`networksetup -setairportpower ${device} on`, execEnv);
    } else {
      await showHUD("🚫 Wi-Fi turned off");
      execSync(`networksetup -setairportpower ${device} off`, execEnv);
    }
  } catch (e) {
    console.error(e);
    await showHUD("❌ " + String(e));
  }
};

export async function getIPV4Address() {
  return new Promise<string>((resolve, reject) => {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (typeof iface !== "undefined") {
        for (let i = 0; i < iface.length; i++) {
          const alias = iface[i];
          if (alias.family === "IPv4" && alias.address !== "127.0.0.1" && !alias.internal) {
            resolve(alias.address);
            break;
          }
        }
      }
    }
    reject("");
  });
}
