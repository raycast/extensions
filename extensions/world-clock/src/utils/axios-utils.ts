import axios from "axios";
import { API_TIMEZONE_BY_IP, TIME_SECOND_TO_HOUR } from "./costants";
import { TimezoneInfo } from "../types/types";
import { calculateTimeInfoByOffset } from "./common-utils";

export const axiosGetIpTime = async (param: string) => {
  return await axios({
    method: "GET",
    url: API_TIMEZONE_BY_IP,
    params: {
      ipAddress: param,
    },
  })
    .then((axiosResponse) => {
      if (axiosResponse && typeof axiosResponse?.data?.error === "undefined") {
        const _timeInfo = axiosResponse.data as TimezoneInfo;
        if (!_timeInfo) return [];
        const { dateTime, utc_datetime } = calculateTimeInfoByOffset(
          Date.now(),
          String(_timeInfo.standardUtcOffset.seconds / TIME_SECOND_TO_HOUR),
        );
        const _timeInfos: [string, string][] = [];
        _timeInfos.push(["Date Time", dateTime]);
        _timeInfos.push(["UTC Time", utc_datetime]);
        _timeInfos.push(["Timezone", _timeInfo.timeZone]);
        _timeInfos.push(["Query IP", param]);
        return _timeInfos;
      }
      return [];
    })
    .catch((reason) => {
      console.error("axiosGetIpTime: " + String(reason));
      return [];
    });
};
