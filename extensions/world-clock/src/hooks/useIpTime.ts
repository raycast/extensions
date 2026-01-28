import axios from "axios";
import { API_IP_GEOLOCATION } from "../utils/costants";
import { IPGeolocation } from "../types/types";
import { isEmpty } from "../utils/common-utils";
import { isIPv4 } from "net";
import { axiosGetIpTime } from "../utils/axios-utils";
import { useCachedPromise } from "@raycast/utils";

const getIpTime = async (searchContent: string) => {
  if (isEmpty(searchContent)) {
    return [];
  }
  if (isIPv4(searchContent)) {
    //ip
    const _timeInfo = await axiosGetIpTime(searchContent);
    return _timeInfo ? (_timeInfo as [string, string][]) : [];
  } else if (searchContent.includes(".")) {
    //domain
    const res = await axios({
      method: "GET",
      url: API_IP_GEOLOCATION + searchContent,
      params: {
        fields: "57344",
      },
    });

    const ipGeolocation = res?.data as IPGeolocation;
    if (isIPv4(ipGeolocation.query)) {
      const _timeInfo = await axiosGetIpTime(ipGeolocation.query);
      if (_timeInfo && _timeInfo.length != 0) {
        return _timeInfo as [string, string][];
      }
    }
  }
  return [];
};

export function useIpTime(searchContent: string) {
  return useCachedPromise(
    (searchContent: string) => {
      return getIpTime(searchContent) as Promise<[string, string][]>;
    },
    [searchContent],
  );
}
