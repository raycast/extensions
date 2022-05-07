import * as os from "os";
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import Values = LocalStorage.Values;

export const commonPreferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    language: preferencesMap.get("language") as string,
  };
};

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export function getIPV4Address() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (typeof iface !== "undefined") {
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        //console.log(alias)
        if (alias.family === "IPv4" && alias.address !== "127.0.0.1" && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return null;
}

export function getIPV6Address() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    //
    const iface = interfaces[devName];
    if (typeof iface !== "undefined") {
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        //console.log(alias)
        if (alias.family === "IPv6" && alias.address !== "::1" && !alias.internal) {
          return alias.address;
        }
      }
    }
  }
  return null;
}
