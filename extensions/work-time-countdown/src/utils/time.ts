import { Color, Icon, getPreferenceValues } from "@raycast/api";
import { differenceInMinutes } from "date-fns";

export function getRemainingTime(now: Date) {
  const getEndHour = () => {
    const { endHour } = getPreferenceValues();
    return endHour.split(":").map((i: string) => Number(i));
  };

  const endOfWorkday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...getEndHour());

  const difference = differenceInMinutes(endOfWorkday, now, { roundingMethod: "floor" });
  const hours = Math.floor(difference / 60);
  const minutes = difference - hours * 60;

  return { hours, minutes };
}

export function getRemainingPercentage(now: Date) {
  const getStartHour = () => {
    const { startHour } = getPreferenceValues();
    return startHour.split(":").map((i: string) => Number(i));
  };

  const getEndHour = () => {
    const { endHour } = getPreferenceValues();
    return endHour.split(":").map((i: string) => Number(i));
  };

  const startOfWorkday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...getStartHour());
  const endOfWorkday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...getEndHour());

  const totalDuration = differenceInMinutes(endOfWorkday, startOfWorkday);
  const elapsedDuration = differenceInMinutes(now, startOfWorkday);

  return (elapsedDuration / totalDuration) * 100;
}

export function getTitle(hours: number, minutes: number) {
  if (!minutes) {
    return `${hours}h`;
  } else if (!hours) {
    return `${minutes}m`;
  } else {
    return `${hours}h ${minutes}m`;
  }
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
  return (progressBar += " " + percentage.toFixed(0) + "%");
}

export function getIcon(hours: number) {
  if (hours < 1) {
    return { source: Icon.Clock, tintColor: Color.Red };
  } else if (hours < 2) {
    return { source: Icon.Clock, tintColor: Color.Orange };
  } else if (hours < 3) {
    return { source: Icon.Clock, tintColor: Color.Yellow };
  } else {
    return { source: Icon.Clock };
  }
}
