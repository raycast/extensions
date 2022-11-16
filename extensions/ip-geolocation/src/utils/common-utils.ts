import * as os from "os";
import { showToast, Toast } from "@raycast/api";
import axios from "axios";
import { IP_GEOLOCATION_API } from "./constants";
import { IPGeolocation } from "../types/ip-geolocation";
import Style = Toast.Style;

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

export function getIPGeolocation(ipv4 = "", language = "en") {
  return axios({
    method: "GET",
    url: IP_GEOLOCATION_API + ipv4,
    params: {
      lang: language,
      fields: "585727",
    },
  })
    .then((response) => {
      return response.data as IPGeolocation;
    })
    .catch((reason) => {
      showToast(Style.Failure, String(reason)).then();
      return { status: "fail" } as IPGeolocation;
    });
}
