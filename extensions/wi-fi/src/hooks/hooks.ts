import { useCallback, useEffect, useState } from "react";
import wifi, { WiFiNetwork } from "node-wifi";
import { LocalStorageKey } from "../utils/constants";
import { WifiNetworkWithPassword, WifiPasswordCache } from "../types/types";
import { getCurWifiStatus, uniqueWifiNetWork } from "../utils/common-utils";
import { LocalStorage } from "@raycast/api";

wifi.init({
  iface: null,
});

export const getWifiList = (refresh: number) => {
  const [wifiPasswordCaches, setWifiPasswordCaches] = useState<WifiPasswordCache[]>([]);
  const [publicWifi, setPublicWifi] = useState<WiFiNetwork[]>([]);
  const [wifiWithPasswordList, setWifiWithPasswordList] = useState<WifiNetworkWithPassword[]>([]);
  const [wifiList, setWifiList] = useState<WiFiNetwork[]>([]);
  const [curWifi, setCurWifi] = useState<WiFiNetwork[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const _curWifi = await wifi.getCurrentConnections();
    setCurWifi(_curWifi);
    const wifiPasswordCache = await LocalStorage.getItem<string>(LocalStorageKey.WIFI_PASSWORD);
    const passwordCaches: WifiPasswordCache[] =
      typeof wifiPasswordCache === "string" ? JSON.parse(wifiPasswordCache) : [];
    setWifiPasswordCaches(passwordCaches);

    const wifiCache = await LocalStorage.getItem<string>(LocalStorageKey.WIFI_CACHE);
    let allWifiList: WiFiNetwork[];
    typeof wifiCache === "string" ? JSON.parse(wifiCache) : [];
    if (typeof wifiCache === "string") {
      allWifiList = JSON.parse(wifiCache) as WiFiNetwork[];
    } else {
      const _allWifiList = (await wifi.scan()).sort((a, b) => b.quality - a.quality);
      allWifiList = uniqueWifiNetWork(_allWifiList);
      if (allWifiList.length > 0) {
        await LocalStorage.setItem(LocalStorageKey.WIFI_CACHE, JSON.stringify(allWifiList));
      }
    }

    const _wifiList: WiFiNetwork[] = [];
    const _wifiListWithPassword: WifiNetworkWithPassword[] = [];
    allWifiList
      .filter((wifiItem) => wifiItem.security !== "NONE")
      .filter((wifiItem) => _curWifi[0].ssid !== wifiItem.ssid)
      .forEach((value1) => {
        const includeWifi = passwordCaches.filter((value2) => value1.ssid === value2.ssid);
        if (includeWifi.length > 0) {
          _wifiListWithPassword.push({ ...value1, password: includeWifi[0].password });
        } else {
          _wifiList.push(value1);
        }
      });
    setWifiWithPasswordList(_wifiListWithPassword);
    setWifiList(_wifiList);
    setPublicWifi(
      allWifiList
        .filter((wifiItem) => wifiItem.security === "NONE")
        .filter((wifiItem) => _curWifi[0].ssid !== wifiItem.ssid)
    );

    const __allWifiList = (await wifi.scan()).sort((a, b) => b.quality - a.quality);
    const _allWifiList = uniqueWifiNetWork(__allWifiList);

    const __wifiList: WiFiNetwork[] = [];
    const __wifiListWithPassword: WifiNetworkWithPassword[] = [];
    _allWifiList
      .filter((wifiItem) => wifiItem.security !== "NONE")
      .filter((wifiItem) => _curWifi[0].ssid !== wifiItem.ssid)
      .forEach((value1) => {
        const includeWifi = passwordCaches.filter((value2) => value1.ssid === value2.ssid);
        if (includeWifi.length > 0) {
          __wifiListWithPassword.push({ ...value1, password: includeWifi[0].password });
        } else {
          __wifiList.push(value1);
        }
      });
    setWifiWithPasswordList(__wifiListWithPassword);
    setWifiList(__wifiList);
    setPublicWifi(
      _allWifiList
        .filter((wifiItem) => wifiItem.security === "NONE")
        .filter((wifiItem) => _curWifi[0].ssid !== wifiItem.ssid)
    );
    setLoading(false);
    if (_allWifiList.length > 0) {
      await LocalStorage.setItem(LocalStorageKey.WIFI_CACHE, JSON.stringify(_allWifiList));
    }
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    wifiPasswordCaches: wifiPasswordCaches,
    publicWifi: publicWifi,
    wifiWithPasswordList: wifiWithPasswordList,
    wifiList: wifiList,
    curWifi: curWifi,
    loading: loading,
  };
};

export const getWifiStatus = () => {
  const [wifiStatus, setWifiStatus] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const _wifiStatus = await getCurWifiStatus();
    setWifiStatus(_wifiStatus);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    wifiStatus: wifiStatus,
  };
};
