import { Color, Icon, getPreferenceValues } from "@raycast/api";
import { differenceInMinutes } from "date-fns";

export function getRemainingTime(now: Date) {
  const { endHour } = getPreferenceValues();
  const [endHourHours, endHourMinutes] = endHour.split(":").map(Number);

  const endOfWorkday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHourHours, endHourMinutes || 0);
  const difference = differenceInMinutes(endOfWorkday, now, { roundingMethod: "floor" });

  if (difference < 0) {
    return { hours: 0, minutes: 0 };
  }

  const hours = Math.floor(difference / 60);
  const minutes = difference % 60;

  return { hours, minutes };
}

export function getRemainingPercentage(now: Date) {
  const { startHour, endHour } = getPreferenceValues();
  const [startHourHours, startHourMinutes] = startHour.split(":").map(Number);
  const [endHourHours, endHourMinutes] = endHour.split(":").map(Number);

  const startOfWorkday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    startHourHours,
    startHourMinutes || 0
  );
  const endOfWorkday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHourHours, endHourMinutes || 0);

  const totalDuration = differenceInMinutes(endOfWorkday, startOfWorkday);
  const elapsedDuration = differenceInMinutes(now, startOfWorkday);

  return (elapsedDuration / totalDuration) * 100;
}

export function getTitle(hours: number, minutes: number): string {
  if (hours <= 0 && minutes <= 0) return "";
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function getProgressBar(percentage: number | null, options: { limit?: number } = {}) {
  if (percentage === null) {
    return "Currently not within working hours. 🥂";
  }

  const { limit = 20 } = options;
  const progress = Math.floor((percentage / 100) * limit);

  let progressBar = "";
  for (let i = 0; i < limit; i++) {
    progressBar += i < progress ? "■" : "□";
  }
  return (progressBar += " " + Math.floor(percentage) + "%");
}

export function getIcon(hours: number, minutes: number) {
  if (hours <= 0 && minutes <= 0) return undefined;
  if (hours < 1) return { source: Icon.Clock, tintColor: Color.Red };
  if (hours < 2) return { source: Icon.Clock, tintColor: Color.Orange };
  if (hours < 3) return { source: Icon.Clock, tintColor: Color.Yellow };
  return { source: Icon.Clock };
}
