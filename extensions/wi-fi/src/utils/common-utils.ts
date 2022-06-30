import { popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import wifi, { WiFiNetwork } from "node-wifi";
import Style = Toast.Style;
import { Dispatch, SetStateAction } from "react";

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

export const uniqueWifiNetWork = (arr: WiFiNetwork[]) => {
  if (arr.length <= 1) {
    return arr;
  }
  const res = new Map();
  return arr.filter((item) => !res.has(item.ssid) && res.set(item.ssid, 1));
};
