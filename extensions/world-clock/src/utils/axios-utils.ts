import axios from "axios";
import { IP_BASE_URL } from "./costants";
import { TimeInfo } from "../types/types";
import { calculateTimeInfoByOffset } from "./common-utils";

export const axiosGetIpTime = async (param: string) => {
  return await axios({
    method: "GET",
    url: IP_BASE_URL + "/" + param,
  })
    .then((axiosResponse) => {
      if (axiosResponse && typeof axiosResponse?.data?.error === "undefined") {
        const _timeInfo = axiosResponse.data as TimeInfo;
        _timeInfo.datetime = calculateTimeInfoByOffset(_timeInfo.unixtime, _timeInfo.utc_offset).dateTime;
        _timeInfo.utc_datetime = calculateTimeInfoByOffset(_timeInfo.unixtime, _timeInfo.utc_offset).utc_datetime;
        if (typeof _timeInfo === "undefined") return undefined;
        const _timeInfos: [string, string][] = [];
        _timeInfos.push(["Date Time", _timeInfo.datetime]);
        _timeInfos.push(["UTC Time", _timeInfo.utc_datetime]);
        _timeInfos.push(["UTC Offset", _timeInfo.utc_offset]);
        _timeInfos.push(["Day of Week", _timeInfo.day_of_week + ""]);
        _timeInfos.push(["Day of Year", _timeInfo.day_of_year + ""]);
        _timeInfos.push(["Week Number", _timeInfo.week_number + ""]);
        _timeInfos.push(["Abbreviation", _timeInfo.abbreviation]);
        _timeInfos.push(["Timezone", _timeInfo.timezone]);
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
