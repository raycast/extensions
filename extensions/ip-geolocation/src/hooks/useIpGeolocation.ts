import { useCachedPromise } from "@raycast/utils";
import { getIPGeolocation, isEmpty } from "../utils/common-utils";
import net from "net";
import { IPGeolocationReadable } from "../types/ip-geolocation";
import { coordinatesFormat } from "../types/preferences";

async function getGeolocation(searchContent: string) {
  searchContent = searchContent.trim();
  if (isEmpty(searchContent) || (!searchContent.includes(".") && !searchContent.includes(":"))) {
    return;
  }
  if (
    ((searchContent.match(/\./g) || []).length === 3 && /^[0-9.]*$/.test(searchContent)) ||
    (searchContent.includes(":") && (searchContent.match(/:/g) || []).length >= 2)
  ) {
    if (!net.isIP(searchContent)) {
      return;
    }
  }
  if (searchContent.startsWith("https://") || searchContent.startsWith("http://")) {
    searchContent = searchContent.replace("https://", "").replace("http://", "");
  }
  if (searchContent.includes("/")) {
    searchContent = searchContent.split("/")[0];
  }
  const ipGeolocation = await getIPGeolocation(searchContent);

  if (ipGeolocation.status === "success") {
    const ipGeolocationReadable: IPGeolocationReadable = {
      IP: ipGeolocation.query,
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
    return [];
  }
}

export function useIpGeolocation(searchContent: string) {
  return useCachedPromise(
    (searchContent: string) => {
      return getGeolocation(searchContent) as Promise<[string, string][]>;
    },
    [searchContent],
  );
}
