import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const buildTimeByUTCTime = (dateTime: string) => {
  if (isEmpty(dateTime)) return "";
  return dateTime.substring(0, dateTime.indexOf(".")).replace("T", " ");
};

export const hour24 = getPreferenceValues<Preferences>().hour24;

export const calculateDateTimeByOffset = (offset: string) => {
  const dateTime = new Date();
  dateTime.setDate(dateTime.getUTCDate());
  dateTime.setHours(dateTime.getUTCHours() + parseInt(offset));
  return {
    date_time: dateTime.toLocaleTimeString("en-us", { hour12: !hour24 }),
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
  return {
    time: dateTime.toLocaleTimeString("en-us", { hour12: !hour24 }),
    dateTime: dateTime.toLocaleString("en-us", { hour12: !hour24 }),
    utc_datetime: utc.toLocaleString("en-us", { hour12: !hour24 }),
  };
};
