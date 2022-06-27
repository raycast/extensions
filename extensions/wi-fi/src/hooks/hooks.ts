import { useCallback, useEffect, useState } from "react";
import wifi, { WiFiNetwork } from "node-wifi";
import { LocalStorage } from "@raycast/api";
import { LocalStorageKey } from "../utils/constants";
import { WifiNetworkWithPassword, WifiPassword } from "../types/types";

wifi.init({
  iface: null,
});

export const getWifiList = (refresh: number) => {
  const [wifiPassword, setWifiPassword] = useState<WifiPassword[]>([]);
  const [wifiWithPasswordList, setWifiWithPasswordList] = useState<WifiNetworkWithPassword[]>([]);
  const [wifiList, setWifiList] = useState<WiFiNetwork[]>([]);
  const [curWifi, setCurWifi] = useState<WiFiNetwork[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const _curWifi = await wifi.getCurrentConnections();
    setCurWifi(_curWifi);
    const localStorageWifiPassword = await LocalStorage.getItem<string>(LocalStorageKey.WIFI_PASSWORD);
    const wifiPassword: WifiPassword[] =
      typeof localStorageWifiPassword === "string" ? JSON.parse(localStorageWifiPassword) : [];
    setWifiPassword(wifiPassword);

    const localStorageWifiCache = await LocalStorage.getItem<string>(LocalStorageKey.WIFI_CACHE);
    let allWifiList: WiFiNetwork[] = [];
    typeof localStorageWifiCache === "string" ? JSON.parse(localStorageWifiCache) : [];
    if (typeof localStorageWifiCache === "string") {
      allWifiList = JSON.parse(localStorageWifiCache);
    } else {
      allWifiList = (await wifi.scan())
        .filter((wifiItem) => wifiItem.security !== "NONE")
        .sort((a, b) => b.quality - a.quality);
    }

    const _wifiList: WiFiNetwork[] = [];
    const _wifiListWithPassword: WifiNetworkWithPassword[] = [];
    allWifiList.forEach((value1) => {
      const includeWifi = wifiPassword.filter((value2) => value1.ssid === value2.ssid);
      if (includeWifi.length > 0) {
        _wifiListWithPassword.push({ ...value1, password: includeWifi[0].password });
      } else {
        _wifiList.push(value1);
      }
    });
    setWifiWithPasswordList(_wifiListWithPassword);
    setWifiList(_wifiList);

    const _allWifiList = (await wifi.scan())
      .filter((wifiItem) => wifiItem.security !== "NONE")
      .sort((a, b) => b.quality - a.quality);

    const __wifiList: WiFiNetwork[] = [];
    const __wifiListWithPassword: WifiNetworkWithPassword[] = [];
    _allWifiList.forEach((value1) => {
      const includeWifi = wifiPassword.filter((value2) => value1.ssid === value2.ssid);
      if (includeWifi.length > 0) {
        __wifiListWithPassword.push({ ...value1, password: includeWifi[0].password });
      } else {
        __wifiList.push(value1);
      }
    });
    setWifiWithPasswordList(__wifiListWithPassword);
    setWifiList(__wifiList);
    setLoading(false);
    await LocalStorage.setItem(LocalStorageKey.WIFI_CACHE, JSON.stringify(_allWifiList));
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    wifiPassword: wifiPassword,
    wifiWithPasswordList: wifiWithPasswordList,
    wifiList: wifiList,
    curWifi: curWifi,
    loading: loading,
  };
};
