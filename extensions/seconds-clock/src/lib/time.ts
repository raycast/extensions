export type TimeFormatPreference = "12-hour" | "24-hour";

export type FormattedClockTime = {
  hours: string;
  minutes: string;
  seconds: string;
  meridiem?: "AM" | "PM";
};

const padTimePart = (value: number) => value.toString().padStart(2, "0");

export function formatClockTime(
  date: Date,
  timeFormat: TimeFormatPreference,
): FormattedClockTime {
  const minutes = padTimePart(date.getMinutes());
  const seconds = padTimePart(date.getSeconds());

  if (timeFormat === "24-hour") {
    return {
      hours: padTimePart(date.getHours()),
      minutes,
      seconds,
    };
  }

  const hour = date.getHours();
  const twelveHour = hour % 12 || 12;

  return {
    hours: padTimePart(twelveHour),
    minutes,
    seconds,
    meridiem: hour >= 12 ? "PM" : "AM",
  };
}

export function formatClockDate(date: Date): string {
  return [date.getDate(), date.getMonth() + 1, date.getFullYear()]
    .map((part) => padTimePart(part))
    .join(" - ");
}
