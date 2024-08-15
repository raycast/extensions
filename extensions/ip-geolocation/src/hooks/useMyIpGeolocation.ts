import { getIPGeolocation, getIPV4Address, getIPV6Address, isEmpty } from "../utils/common-utils";
import { publicIpv4, publicIpv6 } from "public-ip";
import { useCachedPromise } from "@raycast/utils";
import { coordinatesFormat, showIPv6 } from "../types/preferences";

async function getGeolocation() {
  const _ipv4 = getIPV4Address();
  const myInternalIpv4 = (isEmpty(_ipv4) ? "" : _ipv4) as string;
  let myInternalIpv6 = "";
  if (showIPv6) {
    const _ipv6 = getIPV6Address();
    myInternalIpv6 = (isEmpty(_ipv6) ? "" : _ipv6) as string;
  }
  const myPublicIpv4 = await publicIpv4({ onlyHttps: true })
    .then((ip) => ip)
    .catch(() => "");
  let myPublicIpv6 = "";
  if (showIPv6) {
    myPublicIpv6 = await publicIpv6({ onlyHttps: true })
      .then((ip) => ip)
      .catch(() => "");
  }

  const ipGeolocation = await getIPGeolocation(myPublicIpv4);
  if (ipGeolocation.status === "success") {
    const ipGeolocationReadable = {
      "Local IPv4": `${myInternalIpv4}`,
      "Local IPv6": `${myInternalIpv6}`,
      "Public IPv4": `${isEmpty(myPublicIpv4) ? ipGeolocation.query : myPublicIpv4}`,
      "Public IPv6": `${myPublicIpv6}`,
      Location: `${ipGeolocation.country}, ${ipGeolocation.regionName}, ${ipGeolocation.city}${
        isEmpty(ipGeolocation.district) ? "" : ", " + ipGeolocation.district
      }${isEmpty(ipGeolocation.zip) ? "" : ", ZIP: " + ipGeolocation.zip}`, //country  regionName city districtGeoCoordinates: `${ipGeolocation.lon} , ${ipGeolocation.lat}`, //(lon,lat)
      GeoCoordinates:
        coordinatesFormat === "latLon"
          ? `${ipGeolocation.lat} , ${ipGeolocation.lon}` ////(lat,lon)
          : `${ipGeolocation.lon} , ${ipGeolocation.lat}`, ////(lon,lat)
      Timezone: ipGeolocation.timezone,
      AS: ipGeolocation.as.substring(0, ipGeolocation.as.indexOf(" ")),
      ISP: ipGeolocation.isp,
      Organization: ipGeolocation.org,
    };
    return Object.entries(ipGeolocationReadable);
  } else {
    const ipGeolocationReadable = {
      "Local IPv4": `${myInternalIpv4}`,
      "Local IPv6": `${myInternalIpv6}`,
      "Public IPv4": `${isEmpty(myPublicIpv4) ? ipGeolocation.query : myPublicIpv4}`,
      "Public IPv6": `${myPublicIpv6}`,
    };
    return Object.entries(ipGeolocationReadable);
  }
}

export function useMyIpGeolocation() {
  return useCachedPromise(() => {
    return getGeolocation() as Promise<[string, string][]>;
  });
}
