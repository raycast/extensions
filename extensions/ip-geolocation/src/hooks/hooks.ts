import { useCallback, useEffect, useState } from "react";
import { getIPV4Address, getIPV6Address, isEmpty } from "../utils/common-utils";
import axios from "axios";
import { showToast, Toast } from "@raycast/api";
import { IPGeolocation, IPGeolocationReadable } from "../types/ip-geolocation";
import { IP_GEOLOCATION_API } from "../utils/constants";
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
    axios({
      method: "GET",
      url: IP_GEOLOCATION_API + searchContent,
      params: {
        lang: language,
        fields: "585727",
      },
    })
      .then((response) => {
        const ipGeolocation = response.data as IPGeolocation;
        if (ipGeolocation.status === "fail") {
          setIpGeolocation([]);
          setLoading(false);
        } else {
          const ipGeolocationReadable: IPGeolocationReadable = {
            IP: ipGeolocation.query,
            Location: `${ipGeolocation.country}, ${ipGeolocation.regionName}, ${ipGeolocation.city}${
              isEmpty(ipGeolocation.district) ? "" : ", " + ipGeolocation.district
            }${isEmpty(ipGeolocation.zip) ? "" : ", ZIP: " + ipGeolocation.zip}`, //country  regionName city districtGeoCoordinates: `${ipGeolocation.lon} , ${ipGeolocation.lat}`, //(lon,lat)
            GeoCoordinates: `${ipGeolocation.lon} , ${ipGeolocation.lat}`, ////(lon,lat)
            Timezone: ipGeolocation.timezone,
            ISP: ipGeolocation.isp,
            Organization: ipGeolocation.org,
          };
          setIpGeolocation(Object.entries(ipGeolocationReadable));
          setLoading(false);
        }
      })
      .catch((reason) => {
        setLoading(false);
        showToast(Style.Failure, String(reason));
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
    const myInternalIpv4 = getIPV4Address();
    const myInternalIpv6 = getIPV6Address();
    const myPublicIpv4 = await publicIp.v4({ onlyHttps: true });
    const myPublicIpv6 = await publicIp.v6({ onlyHttps: true });

    axios({
      method: "GET",
      url: IP_GEOLOCATION_API + myPublicIpv4,
      params: {
        lang: language,
        fields: "585727",
      },
    })
      .then((response) => {
        const ipGeolocation = response.data as IPGeolocation;
        if (ipGeolocation.status === "fail") {
          const ipGeolocationReadable = {
            "Local IP": `${myInternalIpv4} , ${myInternalIpv6}`,
            "Public IP": `${myPublicIpv4} , ${myPublicIpv6}`,
          };
          setIpGeolocation(Object.entries(ipGeolocationReadable));
          setLoading(false);
        } else {
          const ipGeolocationReadable = {
            "Local IP": `${myInternalIpv4} , ${myInternalIpv6}`,
            "Public IP": `${myPublicIpv4} , ${myPublicIpv6}`,
            Location: `${ipGeolocation.country}, ${ipGeolocation.regionName}, ${ipGeolocation.city}${
              isEmpty(ipGeolocation.district) ? "" : ", " + ipGeolocation.district
            }${isEmpty(ipGeolocation.zip) ? "" : ", ZIP: " + ipGeolocation.zip}`, //country  regionName city district
            GeoCoordinates: `${ipGeolocation.lon} , ${ipGeolocation.lat}`, ////(lon,lat)
            Timezone: ipGeolocation.timezone,
            ISP: ipGeolocation.isp,
            Organization: ipGeolocation.org,
          };
          setIpGeolocation(Object.entries(ipGeolocationReadable));
          setLoading(false);
        }
      })
      .catch((reason) => {
        setLoading(false);
        showToast(Style.Failure, String(reason));
      });
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { ipGeolocation: ipGeolocation, loading: loading };
};
