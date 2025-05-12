import { format, getUnixTime } from "date-fns";
import { Icon } from "@raycast/api";
import { TIME_FORMATS } from "../constants/timeFormats";
import { TimeItem, ConversionResult } from "../types";

/**
 * 生成当前时间的展示列表
 * @returns 当前时间的时间戳和多种格式的时间
 */
export const generateCurrentTimeItems = (): ConversionResult => {
  const now = new Date();
  const unixSeconds = getUnixTime(now);
  const unixMilliseconds = now.getTime();

  // 生成当前时间的时间戳部分
  const timestampItems: TimeItem[] = [
    {
      id: "current-unix-seconds",
      icon: Icon.Clock,
      title: `${unixSeconds}`,
      subtitle: "Current Unix Timestamp (seconds)",
      accessory: "Copy",
      value: `${unixSeconds}`,
    },
    {
      id: "current-unix-milliseconds",
      icon: Icon.Clock,
      title: `${unixMilliseconds}`,
      subtitle: "Current Unix Timestamp (milliseconds)",
      accessory: "Copy",
      value: `${unixMilliseconds}`,
    },
  ];

  // 生成当前时间的各种格式
  const timeFormatItems = TIME_FORMATS.map((formatStr, index) => {
    let formattedDate;
    if (formatStr === "ISO") {
      formattedDate = now.toISOString();
    } else {
      formattedDate = format(now, formatStr);
    }

    return {
      id: `current-time-format-${index}`,
      icon: Icon.Calendar,
      title: formattedDate,
      subtitle: `Current Time (${formatStr === "ISO" ? "ISO 8601" : formatStr})`,
      accessory: "Copy",
      value: formattedDate,
    };
  });

  return [...timestampItems, ...timeFormatItems];
};

/**
 * 将时间戳转换为多种时间格式
 * @param date 日期对象
 * @returns 多种格式的时间列表
 */
export const timestampToDateFormats = (date: Date): ConversionResult => {
  return TIME_FORMATS.map((formatStr, index) => {
    let formattedDate;
    if (formatStr === "ISO") {
      formattedDate = date.toISOString();
    } else {
      formattedDate = format(date, formatStr);
    }

    return {
      id: `timestamp-to-date-${index}`,
      icon: Icon.Calendar,
      title: formattedDate,
      subtitle: `Format: ${formatStr === "ISO" ? "ISO 8601" : formatStr}`,
      accessory: "Copy",
      value: formattedDate,
    };
  });
};

/**
 * 将日期转换为时间戳格式
 * @param date 日期对象
 * @returns 秒级和毫秒级时间戳列表
 */
export const dateToTimestamps = (date: Date): ConversionResult => {
  const unixSeconds = getUnixTime(date);
  const unixMilliseconds = date.getTime();

  return [
    {
      id: "date-to-unix-seconds",
      icon: Icon.Clock,
      title: `${unixSeconds}`,
      subtitle: "Unix Timestamp (seconds)",
      accessory: "Copy",
      value: `${unixSeconds}`,
    },
    {
      id: "date-to-unix-milliseconds",
      icon: Icon.Clock,
      title: `${unixMilliseconds}`,
      subtitle: "Unix Timestamp (milliseconds)",
      accessory: "Copy",
      value: `${unixMilliseconds}`,
    },
    {
      id: "date-to-iso",
      icon: Icon.Calendar,
      title: date.toISOString(),
      subtitle: "ISO 8601 Format",
      accessory: "Copy",
      value: date.toISOString(),
    },
  ];
};
