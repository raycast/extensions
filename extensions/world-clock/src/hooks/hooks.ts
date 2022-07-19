import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { IP_GEOLOCATION_API, localStorageKey, TIMEZONE_BASE_URL } from "../utils/costants";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { IPGeolocation, TimeInfo, Timezone } from "../types/types";
import {
  calculateDateTimeByOffset,
  calculateTimeInfoByOffset,
  getStarredTimezones,
  isEmpty,
} from "../utils/common-utils";
import { isIPv4 } from "net";
import { axiosGetIpTime } from "../utils/axios-utils";
import Style = Toast.Style;

export const getAllTimezones = (refresh: number, timezone: string) => {
  const [oldTimezone, setOldTimezone] = useState<string>("");
  const [timezones, setTimezones] = useState<string[]>([]);
  const [starTimezones, setStarTimezones] = useState<Timezone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    if (timezone !== oldTimezone) {
      setOldTimezone(timezone);
      const _starTimezones = [...starTimezones];
      _starTimezones.forEach((value) => {
        value.date_time = calculateDateTimeByOffset(value.utc_offset).date_time;
        value.unixtime = calculateDateTimeByOffset(value.utc_offset).unixtime;
      });
      setStarTimezones(_starTimezones);
      return;
    }
    setLoading(true);

    const _localStorage = await LocalStorage.getItem<string>(localStorageKey.TIMEZONE_CACHE);
    const _timezoneCache = typeof _localStorage === "undefined" ? [] : (JSON.parse(_localStorage) as string[]);

    if (_timezoneCache.length === 0) {
      //init cache
      axios({
        method: "GET",
        url: TIMEZONE_BASE_URL,
      })
        .then(async (axiosResponse) => {
          const _starTimezones = await getStarredTimezones();
          setStarTimezones(_starTimezones);
          setTimezones(await buildStarTimezone(axiosResponse.data as string[]));
          setLoading(false);

          await LocalStorage.setItem(localStorageKey.TIMEZONE_CACHE, JSON.stringify(axiosResponse.data));
        })
        .catch((reason) => {
          showToast(Style.Failure, String(reason));
          setLoading(false);
        });
    } else {
      const _starTimezones = await getStarredTimezones();
      setStarTimezones(_starTimezones);
      setTimezones(await buildStarTimezone(_timezoneCache));
      setLoading(false);

      //update cache
      axios({
        method: "GET",
        url: TIMEZONE_BASE_URL,
      })
        .then(async (axiosResponse) => {
          await LocalStorage.setItem(localStorageKey.TIMEZONE_CACHE, JSON.stringify(axiosResponse.data));
        })
        .catch((reason) => {
          console.error(String(reason));
        });
    }
  }, [refresh, timezone]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { starTimezones: starTimezones, timezones: timezones, loading: loading };
};

const buildStarTimezone = async (allTimezone: string[]) => {
  const _localStorage = await LocalStorage.getItem<string>(localStorageKey.STAR_TIMEZONE);
  const _starTimezones = typeof _localStorage === "undefined" ? [] : (JSON.parse(_localStorage) as Timezone[]);

  _starTimezones.forEach((value) => {
    const index = allTimezone.indexOf(value.timezone);
    if (index !== -1) allTimezone.splice(index, 1);
    value.date_time = calculateDateTimeByOffset(value.utc_offset).date_time;
    value.unixtime = calculateDateTimeByOffset(value.utc_offset).unixtime;
  });
  return allTimezone;
};

export const getRegionTime = (timezone: string) => {
  const [timeInfo, setTimeInfo] = useState<TimeInfo>({} as TimeInfo);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    if (isEmpty(timezone)) return;
    setLoading(true);

    axios({
      method: "GET",
      url: TIMEZONE_BASE_URL + "/" + timezone,
    })
      .then((axiosResponse) => {
        const _timeInfo = axiosResponse.data as TimeInfo;
        _timeInfo.datetime = calculateTimeInfoByOffset(_timeInfo.unixtime, _timeInfo.utc_offset).dateTime;
        _timeInfo.utc_datetime = calculateTimeInfoByOffset(_timeInfo.unixtime, _timeInfo.utc_offset).utc_datetime;

        setTimeInfo(_timeInfo);
        setLoading(false);
      })
      .catch((reason) => {
        showToast(Style.Failure, String(reason));
        setLoading(false);
      });
  }, [timezone]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { timeInfo: timeInfo, detailLoading: loading };
};
//get if show detail
export const getIsShowDetail = (refreshDetail: number) => {
  const [showDetail, setShowDetail] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    const localStorage = await LocalStorage.getItem<boolean>(localStorageKey.SHOW_DETAILS);
    const _showDetailKey = typeof localStorage === "undefined" ? true : localStorage;
    setShowDetail(_showDetailKey);
  }, [refreshDetail]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { showDetail: showDetail };
};

export const getIpTime = (searchContent: string) => {
  const [timeInfo, setTimeInfo] = useState<[string, string][]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      setTimeInfo([]);
      if (isEmpty(searchContent)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      if (isIPv4(searchContent)) {
        //ip
        const _timeInfo = await axiosGetIpTime(searchContent);
        if (typeof _timeInfo !== "undefined") {
          setTimeInfo(_timeInfo);
        }
      } else if (searchContent.includes(".")) {
        //domain
        const res = await axios({
          method: "GET",
          url: IP_GEOLOCATION_API + searchContent,
          params: {
            fields: "57344",
          },
        });

        const ipGeolocation = res?.data as IPGeolocation;
        if (isIPv4(ipGeolocation.query)) {
          const _timeInfo = await axiosGetIpTime(ipGeolocation.query);
          if (typeof _timeInfo !== "undefined" && _timeInfo?.length != 0) {
            setTimeInfo(_timeInfo as [string, string][]);
          }
        }
      }
      setLoading(false);
    } catch (e) {
      setLoading(false);
      console.error(String(e));
    }
  }, [searchContent]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { timeInfo: timeInfo, loading: loading };
};
