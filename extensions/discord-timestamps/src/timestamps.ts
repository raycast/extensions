export type TimestampType = "t" | "T" | "d" | "D" | "f" | "F" | "R" | "E" | "I";

export const generateTimestamp = (timestamp: Date, type: TimestampType): string => {
  switch (type) {
    case "E":
      return `${timestamp.valueOf()}`;
    case "I":
      return `${timestamp.toISOString()}`;
    default:
      return `<t:${Math.floor(timestamp.valueOf() / 1000)}:${type}>`;
  }
};

export const prettyPreview = (timestamp: Date, type: TimestampType): string => {
  switch (type) {
    case "t":
      return `${timestamp.getHours()}:${ensureTwoDigits(timestamp.getMinutes())} ${amPm(timestamp.getHours())}`;
    case "T":
      return `${timestamp.getHours()}:${ensureTwoDigits(timestamp.getMinutes())}:${ensureTwoDigits(
        timestamp.getSeconds()
      )} ${amPm(timestamp.getHours())}`;
    case "d":
      return `${timestamp.getMonth()}/${timestamp.getDate()}/${timestamp.getFullYear()}`;
    case "D":
      return `${dayOfTheMonth(timestamp.getMonth())} ${timestamp.getDate()}, ${timestamp.getFullYear()}`;
    case "f":
      return `${dayOfTheMonth(
        timestamp.getMonth()
      )} ${timestamp.getDate()}, ${timestamp.getFullYear()} ${timestamp.getHours()}:${ensureTwoDigits(
        timestamp.getMinutes()
      )} ${amPm(timestamp.getHours())}`;
    case "F":
      return `${dayOfTheWeek(timestamp.getDay())}, ${dayOfTheMonth(
        timestamp.getMonth()
      )} ${timestamp.getDate()}, ${timestamp.getFullYear()} ${timestamp.getHours()}:${ensureTwoDigits(
        timestamp.getMinutes()
      )} ${amPm(timestamp.getHours())}`;
    case "R":
      return `${timeSince(timestamp)}`;
    case "E":
      return `${timestamp.valueOf()}`;
    case "I":
      return `${timestamp.toISOString()}`;
  }
};

const ensureTwoDigits = (num: number) => {
  if (num < 10) {
    return `0${num}`;
  } else {
    return `${num}`;
  }
};

const amPm = (hour: number) => {
  if (hour >= 12) {
    return "PM";
  } else {
    return "AM";
  }
};

const dayOfTheMonth = (month: number) => {
  switch (month) {
    case 0:
      return "January";
    case 1:
      return "February";
    case 2:
      return "March";
    case 3:
      return "April";
    case 4:
      return "May";
    case 5:
      return "June";
    case 6:
      return "July";
    case 7:
      return "August";
    case 8:
      return "September";
    case 9:
      return "October";
    case 10:
      return "November";
    case 11:
      return "December";
  }
};

const dayOfTheWeek = (day: number) => {
  switch (day) {
    case 0:
      return "Sunday";
    case 1:
      return "Monday";
    case 2:
      return "Tuesday";
    case 3:
      return "Wednesday";
    case 4:
      return "Thursday";
    case 5:
      return "Friday";
    case 6:
      return "Saturday";
  }
};

const timeSince = (date: Date) => {
  const seconds = Math.floor(Date.now() - date.valueOf()) / 1000;
  if (seconds < 0) return timeUntil(date);
  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  return Math.floor(seconds) + " seconds ago";
};

const timeUntil = (date: Date) => {
  const seconds = Math.floor(date.valueOf() - Date.now()) / 1000;
  let interval = seconds / 31536000;
  if (interval > 1) {
    return `in ${Math.floor(interval)} years`;
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return `in ${Math.floor(interval)} months`;
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return `in ${Math.floor(interval)} days`;
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return `in ${Math.floor(interval)} hours`;
  }
  interval = seconds / 60;
  if (interval > 1) {
    return `in ${Math.floor(interval)} minutes`;
  }
  return `in ${Math.floor(seconds)} seconds`;
};

const DISCORD_EPOCH = 1420070400000;

// Converts a snowflake ID string into a Date object using the provided epoch (in ms), or Discord's epoch if not provided
export function convertSnowflakeToDate(snowflake: string, epoch: number = DISCORD_EPOCH): Date {
  // Convert snowflake to BigInt to extract timestamp bits
  // https://discord.com/developers/docs/reference#snowflakes
  const milliseconds: bigint = BigInt(snowflake) >> 22n;
  return new Date(Number(milliseconds) + epoch);
}

// Validates a snowflake ID string and returns a Date object if valid
export function validateSnowflake(snowflake: string, epoch?: number): Date {
  if (!Number.isInteger(+snowflake)) {
    throw new Error("Snowflakes contain only numbers");
  }

  if (parseInt(snowflake) < 4194304) {
    throw new Error("Snowflakes are much larger numbers");
  }

  const timestamp: Date = convertSnowflakeToDate(snowflake, epoch);

  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Snowflakes have fewer digits");
  }

  return timestamp;
}
