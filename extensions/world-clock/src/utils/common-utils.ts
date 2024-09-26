import { Image, LocalStorage } from "@raycast/api";
import { dateFormat, hour24 } from "../types/preferences";
import { localStorageKey } from "./costants";
import { Timezone } from "../types/types";
import { format } from "date-fns";
import Mask = Image.Mask;

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export function formatMenubarDate(date: Date) {
  let dateFormatStr: string;
  switch (dateFormat) {
    case "en": {
      dateFormatStr = "MM/dd/yyyy";
      break;
    }
    case "en-GB": {
      dateFormatStr = "dd/MM/yyyy";
      break;
    }
    default: {
      dateFormatStr = "yyyy-MM-dd";
    }
  }
  let sanitizedFormat = dateFormatStr.replace(/y+\/?|\/?y+/gi, "").trim();
  sanitizedFormat = sanitizedFormat
    .replace(/^\/|\/$/g, "")
    .replace(/^\.|\.$/g, "")
    .replace(/^-|-$/g, "");

  const time = date.toLocaleTimeString("en-US", {
    hour12: !hour24,
    hour: "2-digit",
    minute: "2-digit",
  });

  const weekDayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  return weekDayShort + " " + format(date, sanitizedFormat) + " " + time;
}

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
  return (
    dateTime.toLocaleDateString(dateFormat) +
    " " +
    dateTime.toLocaleTimeString("en-US", {
      hour12: !hour24,
      hour: "2-digit",
      minute: "2-digit",
    })
  );
};

export const calculateDateTimeByOffset = (offset: string) => {
  const dateTime = new Date();
  dateTime.setDate(dateTime.getUTCDate());
  dateTime.setHours(dateTime.getUTCHours() + parseInt(offset));
  dateTime.setMinutes(dateTime.getUTCMinutes() + parseInt(offset.split(":")[1]));
  return {
    date_time: dateTime.toLocaleTimeString("en-US", {
      hour12: !hour24,
      hour: "2-digit",
      minute: "2-digit",
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
  dateTime.setMinutes(dateTime.getUTCMinutes() + parseInt(offset.split(":")[1]));
  //utc time
  const utc = new Date(parseInt(unixtimeStr));
  utc.setDate(utc.getDate());
  utc.setHours(utc.getUTCHours());

  const time = dateTime.toLocaleTimeString("en-US", {
    hour12: !hour24,
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    time: time,
    dateTime: buildFullDateTime(dateTime),
    utc_datetime: buildFullDateTime(utc),
    dateRaw: dateTime,
  };
};

export const getGridAvatar = (timezone: Timezone) => {
  if (timezone.avatar && timezone.avatar.length > 0) {
    return {
      source: timezone.avatar[0],
      mask: Mask.RoundedRectangle,
    };
  } else {
    return timezone.memoIcon;
  }
};

export const getMenubarAvatar = (timezone: Timezone) => {
  if (timezone.avatar && timezone.avatar.length > 0) {
    return {
      source: timezone.avatar[0],
      mask: Mask.RoundedRectangle,
    };
  } else {
    return {
      source: {
        light: buildDayAndNightIcon(timezone.unixtime, true),
        dark: buildDayAndNightIcon(timezone.unixtime, false),
      },
    };
  }
};

export const addTimeZones = async (starTimezones: Timezone[], timezone: Timezone, index: number = -1) => {
  const _starTimezones = [...starTimezones];
  if (index == -1) {
    _starTimezones.push(timezone);
  } else {
    _starTimezones.splice(index, 0, timezone);
  }
  _starTimezones.forEach((value) => {
    value.date_time = "";
    value.unixtime = 0;
  });
  await LocalStorage.setItem(localStorageKey.STAR_TIMEZONE, JSON.stringify(_starTimezones));
};
