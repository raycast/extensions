import { Activity } from "./types";

export function timeDelta(timerStartString: string): number {
  return (Date.now() - Date.parse(timerStartString)) / 1000;
}

export function secondsParser(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsLeft = Math.floor(seconds % 60);

  return `${hours}:${minutes > 9 ? minutes : `0${minutes}`}:${secondsLeft > 9 ? secondsLeft : `0${secondsLeft}`}`;
}

export function toDecimalTime(time: string) {
  const [hours, minutes] = time.split(":");
  return Number(hours) + Number(minutes) / 60;
}

// The running activity, else the last touched one. Stopping a timer updates updated_at.
export function currentActivity(activities: Activity[]): Activity | undefined {
  return (
    activities.find((activity) => activity.timer_started_at !== null) ??
    activities.reduce<Activity | undefined>(
      (latest, activity) => (latest === undefined || activity.updated_at > latest.updated_at ? activity : latest),
      undefined,
    )
  );
}

// Accepted time input: "h:mm" or decimal hours with "." or ",".
export const TIME_PATTERN = /^\d+(:[0-5]\d)?$|^\d+([.,]\d+)?$/;

export function validateTime(value: string | undefined): string | undefined {
  const time = value?.trim() ?? "";
  return time === "" || TIME_PATTERN.test(time) ? undefined : "Use h:mm or decimal hours, e.g. 1:30 or 1.5";
}

export function parseHours(time: string): number {
  const trimmed = time.trim();
  return trimmed.includes(":") ? toDecimalTime(trimmed) : Number(trimmed.replace(",", "."));
}
