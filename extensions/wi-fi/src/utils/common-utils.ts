import { closeMainWindow, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import wifi, { WiFiNetwork } from "node-wifi";
import Style = Toast.Style;
import { Dispatch, SetStateAction } from "react";
import { getCachedEnv } from "./shell-utils";
import { execSync } from "child_process";

export const connectWifi = async (ssid: string, password: string, setRefresh: Dispatch<SetStateAction<number>>) => {
  const toast = await showToast(Style.Animated, "Connecting...");
  wifi.connect(
    {
      ssid: ssid,
      password: password,
    },
    async () => {
      setRefresh(Date.now());
      const curWifi = await wifi.getCurrentConnections();
      if (curWifi[0].ssid === ssid) {
        await showHUD(`Connected to ${ssid} successfully`);
        await toast.hide();
        await popToRoot();
      } else {
        await showToast(Style.Failure, "Failure to connect");
      }
    }
  );
};

export const getCurWifiStatus = async () => {
  try {
    const execEnv = await getCachedEnv();
    const out = execSync(
      `networksetup -listnetworkserviceorder | sed -n '/Wi-Fi/s|.*Device: \\(.*\\)).*|\\1|p'`,
      execEnv
    );
    const device = String(out).trim();
    const out2 = execSync(`networksetup -getairportnetwork ${device}`, execEnv);
    const network = String(out2).trim();
    if (network.includes("off")) {
      return false;
    } else {
      return true;
    }
  } catch (e) {
    return true;
  }
};

export const toggleWifi = async () => {
  try {
    const execEnv = await getCachedEnv();
    const out = execSync(
      `networksetup -listnetworkserviceorder | sed -n '/Wi-Fi/s|.*Device: \\(.*\\)).*|\\1|p'`,
      execEnv
    );
    const device = String(out).trim();
    const out2 = execSync(`networksetup -getairportnetwork ${device}`, execEnv);
    const network = String(out2).trim();
    if (network.includes("off")) {
      await showHUD("Wi-Fi turned on");
      execSync(`networksetup -setairportpower ${device} on`, execEnv);
    } else {
      await showHUD("Wi-Fi turned off");
      execSync(`networksetup -setairportpower ${device} off`, execEnv);
    }
  } catch (e) {
    console.error(e);
    await showHUD(String(e));
  }
};

export const uniqueWifiNetWork = (arr: WiFiNetwork[]) => {
  if (arr.length <= 1) {
    return arr;
  }
  const res = new Map();
  return arr.filter((item) => !res.has(item.ssid) && res.set(item.ssid, 1));
};
