import axios from "axios";
import { TIMEZONE_BASE_URL } from "../utils/costants";
import { TimeInfo } from "../types/types";
import { useCachedPromise } from "@raycast/utils";
import { calculateTimeInfoByOffset } from "../utils/common-utils";

export const getRegionTime = async (timezone: string) => {
  const axiosResponse = await axios({
    method: "GET",
    url: TIMEZONE_BASE_URL + "/" + timezone,
  });
  const timeInfo = axiosResponse.data as TimeInfo;
  const { dateTime, utc_datetime } = calculateTimeInfoByOffset(timeInfo.unixtime, timeInfo.utc_offset);
  timeInfo.datetime = dateTime;
  timeInfo.utc_datetime = utc_datetime;
  return timeInfo;
};

export function useRegionTimeInfo(timezone: string) {
  return useCachedPromise(
    (timezone: string) => {
      return getRegionTime(timezone) as Promise<TimeInfo>;
    },
    [timezone],
  );
}
