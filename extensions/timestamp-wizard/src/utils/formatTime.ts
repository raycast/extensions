import { format, getUnixTime } from "date-fns";
import { Icon } from "@raycast/api";
import { TIME_FORMATS } from "../constants/timeFormats";
import { TimeItem, ConversionResult } from "../types";

/**
 * Generate current time display list
 * @returns Current timestamp and time in multiple formats
 */
export const generateCurrentTimeItems = (): ConversionResult => {
  const now = new Date();
  const unixSeconds = getUnixTime(now);
  const unixMilliseconds = now.getTime();

  // Generate timestamp portion of the current time
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

  // Generate various formats of current time
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
 * Convert timestamp to multiple time formats
 * @param date Date object
 * @returns List of time in various formats
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
 * Convert date to timestamp formats
 * @param date Date object
 * @returns List of second-level and millisecond-level timestamps
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
