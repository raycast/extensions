import * as os from "os";
import { Cache } from "@raycast/api";
import axios from "axios";
import { IP_GEOLOCATION_API } from "./constants";
import { IPGeolocation } from "../types/ip-geolocation";
import { language } from "../types/preferences";

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

export async function getIPGeolocation(ipv4: string) {
  try {
    const response = await axios({
      method: "GET",
      url: IP_GEOLOCATION_API + ipv4,
      params: {
        lang: language,
        fields: "585727",
      },
    });
    return response.data as IPGeolocation;
  } catch (reason) {
    console.error(`getIPGeolocation error: ${reason}`);
    return { status: "fail" } as IPGeolocation;
  }
}

export const getArgument = (arg: string, argKey: string) => {
  const cache = new Cache({ namespace: "Args" });
  if (typeof arg !== "undefined") {
    // call from main window
    cache.set(argKey, arg);
    return arg;
  } else {
    // call from hotkey
    const cacheStr = cache.get(argKey);
    if (typeof cacheStr !== "undefined") {
      return cacheStr;
    } else {
      return "";
    }
  }
};

export const getArguments = (args: string[], argKeys: string[]) => {
  if (args.length !== argKeys.length) {
    return { args: [] };
  } else {
    const argsObj = [];
    for (let i = 0; i < args.length; i++) {
      argsObj.push(getArgument(args[i], argKeys[i]));
    }
    return { args: argsObj };
  }
};
