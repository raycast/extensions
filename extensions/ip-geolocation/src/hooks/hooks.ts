import { useCallback, useEffect, useState } from "react";
import { getIPGeolocation, getIPV4Address, getIPV6Address, isEmpty } from "../utils/common-utils";
import { showToast, Toast } from "@raycast/api";
import { IPGeolocation, IPGeolocationReadable } from "../types/ip-geolocation";
import publicIp from "public-ip";
import Style = Toast.Style;

export const searchIpGeolocation = (language: string, searchContent: string) => {
  const [ipGeolocation, setIpGeolocation] = useState<[string, string][]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    if (isEmpty(searchContent) || !searchContent.includes(".")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    if (searchContent.startsWith("https://") || searchContent.startsWith("http://")) {
      searchContent = searchContent.replace("https://", "").replace("http://", "");
    }

    getIPGeolocation(searchContent, language)
      .then((ipGeolocation: IPGeolocation) => {
        if (ipGeolocation.status === "success") {
          const ipGeolocationReadable: IPGeolocationReadable = {
            IP: ipGeolocation.query,
            Location: `${ipGeolocation.country}, ${ipGeolocation.regionName}, ${ipGeolocation.city}${
              isEmpty(ipGeolocation.district) ? "" : ", " + ipGeolocation.district
            }${isEmpty(ipGeolocation.zip) ? "" : ", ZIP: " + ipGeolocation.zip}`, //country  regionName city districtGeoCoordinates: `${ipGeolocation.lon} , ${ipGeolocation.lat}`, //(lon,lat)
            GeoCoordinates: `${ipGeolocation.lon} , ${ipGeolocation.lat}`, ////(lon,lat)
            Timezone: ipGeolocation.timezone,
            AS: ipGeolocation.as.substring(0, ipGeolocation.as.indexOf(" ")),
            ISP: ipGeolocation.isp,
            Organization: ipGeolocation.org,
          };
          setIpGeolocation(Object.entries(ipGeolocationReadable));
        }
        setLoading(false);
      })
      .catch((error: Error) => {
        setLoading(false);
        showToast(Style.Failure, String(error));
      });
  }, [searchContent]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { ipGeolocation: ipGeolocation, loading: loading };
};

export const searchMyIpGeolocation = (language: string) => {
  const [ipGeolocation, setIpGeolocation] = useState<[string, string][]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      const _ipv4 = getIPV4Address();
      const myInternalIpv4 = (isEmpty(_ipv4) ? "" : _ipv4) as string;
      const _ipv6 = getIPV6Address();
      const myInternalIpv6 = (isEmpty(_ipv6) ? "" : _ipv6) as string;
      const myPublicIpv4 = await publicIp
        .v4({ onlyHttps: true })
        .then((ip) => ip)
        .catch(() => "");
      const myPublicIpv6 = await publicIp
        .v6({ onlyHttps: true })
        .then((ip) => ip)
        .catch(() => "");

      getIPGeolocation(myPublicIpv4, language)
        .then((ipGeolocation: IPGeolocation) => {
          let ipGeolocationReadable;
          if (ipGeolocation.status === "success") {
            ipGeolocationReadable = {
              "Local IP": `${myInternalIpv4}${isEmpty(myInternalIpv6) ? "" : " , " + myInternalIpv6}`,
              "Public IP": `${isEmpty(myPublicIpv4) ? ipGeolocation.query : myPublicIpv4}${
                isEmpty(myPublicIpv6) ? "" : " , " + myPublicIpv6
              }`,
              Location: `${ipGeolocation.country}, ${ipGeolocation.regionName}, ${ipGeolocation.city}${
                isEmpty(ipGeolocation.district) ? "" : ", " + ipGeolocation.district
              }${isEmpty(ipGeolocation.zip) ? "" : ", ZIP: " + ipGeolocation.zip}`, //country  regionName city districtGeoCoordinates: `${ipGeolocation.lon} , ${ipGeolocation.lat}`, //(lon,lat)
              GeoCoordinates: `${ipGeolocation.lon} , ${ipGeolocation.lat}`, ////(lon,lat)
              Timezone: ipGeolocation.timezone,
              AS: ipGeolocation.as.substring(0, ipGeolocation.as.indexOf(" ")),
              ISP: ipGeolocation.isp,
              Organization: ipGeolocation.org,
            };
          } else {
            ipGeolocationReadable = {
              "Local IP": `${myInternalIpv4}${isEmpty(myInternalIpv6) ? "" : " , " + myInternalIpv6}`,
              "Public IP": `${isEmpty(myPublicIpv4) ? ipGeolocation.query : myPublicIpv4}${
                isEmpty(myPublicIpv6) ? "" : " , " + myPublicIpv6
              }`,
            };
          }
          setIpGeolocation(Object.entries(ipGeolocationReadable));
          setLoading(false);
        })
        .catch((error: Error) => {
          setLoading(false);
          showToast(Style.Failure, String(error));
        });
    } catch (e) {
      console.error(String(e));
      setLoading(false);
      await showToast(Style.Failure, String(e));
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { ipGeolocation: ipGeolocation, loading: loading };
};
