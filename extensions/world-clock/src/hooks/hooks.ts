import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { IP_GEOLOCATION_API, LOCALSTORAGE_KEY, TIMEZONE_BASE_URL } from "../utils/costants";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { IPGeolocation, TimeInfo } from "../types/types";
import { isEmpty } from "../utils/common-utils";
import { isIPv4 } from "net";
import { axiosGetIpTime } from "../utils/axios-utils";
import Style = Toast.Style;

export const getAllTimezones = (refresh: number) => {
  const [timezones, setTimezones] = useState<string[]>([]);
  const [starTimezones, setStarTimezones] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    axios({
      method: "GET",
      url: TIMEZONE_BASE_URL,
    })
      .then(async (axiosResponse) => {
        const _localStorage = await LocalStorage.getItem<string>(LOCALSTORAGE_KEY);
        const _starTimezones = typeof _localStorage === "undefined" ? [] : (JSON.parse(_localStorage) as string[]);

        const allTimeZone = axiosResponse.data as string[];
        _starTimezones.forEach((value) => {
          const index = allTimeZone.indexOf(value);
          if (index !== -1) allTimeZone.splice(index, 1);
        });

        setStarTimezones(_starTimezones);
        setTimezones(allTimeZone);
        setLoading(false);
      })
      .catch((reason) => {
        showToast(Style.Failure, String(reason));
        setLoading(false);
      });
  }, [refresh]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { starTimezones: starTimezones, timezones: timezones, loading: loading };
};

export const getRegionTime = (region: string) => {
  const [timeInfo, setTimeInfo] = useState<TimeInfo>({} as TimeInfo);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    if (isEmpty(region)) return;

    axios({
      method: "GET",
      url: TIMEZONE_BASE_URL + "/" + region,
    })
      .then((axiosResponse) => {
        setTimeInfo(axiosResponse.data as TimeInfo);
        setLoading(false);
      })
      .catch((reason) => {
        showToast(Style.Failure, String(reason));
        setLoading(false);
      });
  }, [region]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { timeInfo: timeInfo, detailLoading: loading };
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
