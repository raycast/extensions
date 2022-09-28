import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { Preferences } from "../types/preferences";
import { localStorageKey } from "./costants";
import { Timezone } from "../types/types";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const getStarredTimezones = async () => {
  const _localStorage = await LocalStorage.getItem<string>(localStorageKey.STAR_TIMEZONE);
  const _starTimezones = typeof _localStorage === "undefined" ? [] : (JSON.parse(_localStorage) as Timezone[]);
  _starTimezones.forEach((value) => {
    value.date_time = calculateDateTimeByOffset(value.utc_offset).date_time;
    value.unixtime = calculateDateTimeByOffset(value.utc_offset).unixtime;
  });
  return _starTimezones;
};

export const hour24 = getPreferenceValues<Preferences>().hour24;

const build2DigitTime = (num: string | number) => {
  const numStr = num + "";
  return numStr.length <= 1 ? "0" + numStr : numStr;
};

const buildHour24Time = (date: Date) => {
  return (
    build2DigitTime(date.getHours()) +
    ":" +
    build2DigitTime(date.getMinutes()) +
    ":" +
    build2DigitTime(date.getSeconds())
  );
};

export const buildDayAndNightIcon = (dateTime: string | number, light: boolean) => {
  const date = new Date(dateTime);
  const hour = date.getHours();
  if (hour < 6 || hour >= 18) {
    return light ? "night-icon.svg" : "night-icon@dark.svg";
  } else {
    return light ? "day-icon.svg" : "day-icon@dark.svg";
  }
};

export const buildIntervalTime = (dateTime: string | number) => {
  const date = new Date(dateTime);
  const nowDate = new Date();
  if (date > nowDate) {
    const intervalTime = date.getTime() - nowDate.getTime();
    const hour = Math.floor(intervalTime / 1000 / 60 / 60);
    if (hour + 1 !== 0) {
      return `, ${hour + 1} hour later`;
    }
  } else if (date < nowDate) {
    const intervalTime = nowDate.getTime() - date.getTime();
    const hour = Math.floor(intervalTime / 1000 / 60 / 60);
    if (hour !== 0) {
      return `, ${hour} hour ago`;
    }
  }
  return ``;
};

export const buildFullDateTime = (dateTime: Date) => {
  if (hour24) {
    const time = buildHour24Time(dateTime);
    const _datetime = dateTime.toLocaleDateString() + " " + time;
    return _datetime;
  } else {
    return (
      dateTime.toLocaleDateString() +
      " " +
      dateTime.toLocaleString("en-US", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    );
  }
};

export const calculateDateTimeByOffset = (offset: string) => {
  const dateTime = new Date();
  dateTime.setDate(dateTime.getUTCDate());
  dateTime.setHours(dateTime.getUTCHours() + parseInt(offset));
  return {
    date_time: hour24
      ? buildHour24Time(dateTime)
      : dateTime.toLocaleTimeString("en-US", {
          hour12: true,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
    unixtime: dateTime.getTime(),
  };
};

export const calculateTimeInfoByOffset = (unixtime: number, offset: string) => {
  let unixtimeStr = unixtime + "";
  unixtimeStr = unixtimeStr.length === 10 ? unixtimeStr + "000" : unixtimeStr;
  //local current time
  const dateTime = new Date(parseInt(unixtimeStr));
  dateTime.setDate(dateTime.getUTCDate());
  dateTime.setHours(dateTime.getUTCHours() + parseInt(offset));
  //utc time
  const utc = new Date(parseInt(unixtimeStr));
  utc.setDate(utc.getDate());
  utc.setHours(utc.getUTCHours());

  let time = dateTime.toLocaleTimeString("en-US", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  let _datetime = dateTime.toLocaleString("en-US", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  let _utcDatetime = utc.toLocaleString("en-us", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  if (hour24) {
    time = buildHour24Time(dateTime);
    _datetime = dateTime.toLocaleDateString() + " " + time;
    _utcDatetime = utc.toLocaleDateString() + " " + buildHour24Time(utc);
  }
  return {
    time: time,
    dateTime: _datetime,
    utc_datetime: _utcDatetime,
  };
};
