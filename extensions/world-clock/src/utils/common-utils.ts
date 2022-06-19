import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types/preferences";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
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

export const buildHour24DateTime = (date: Date) => {
  return (
    date.toLocaleDateString() +
    " " +
    build2DigitTime(date.getHours()) +
    ":" +
    build2DigitTime(date.getMinutes()) +
    ":" +
    build2DigitTime(date.getSeconds())
  );
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
