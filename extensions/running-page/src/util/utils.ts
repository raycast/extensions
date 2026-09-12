import { Activity, LocationCountry } from "../type";
import { RUN_TITLES } from "./const";
import { showFailureToast } from "@raycast/utils";

export const formatPace = (d: number): string => {
  if (Number.isNaN(d)) return "0";
  const pace = (1000.0 / 60.0) * (1.0 / d);
  const minutes = Math.floor(pace);
  const seconds = Math.floor((pace - minutes) * 60.0);
  return `${minutes}'${seconds.toFixed(0).toString().padStart(2, "0")}"`;
};

export const convertMovingTime2Sec = (moving_time: string): number => {
  if (!moving_time) {
    return 0;
  }
  // moving_time : '2 days, 12:34:56' or '12:34:56';
  const splits = moving_time.split(", ");
  const days = splits.length == 2 ? parseInt(splits[0]) : 0;
  const time = splits.splice(-1)[0];
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return ((days * 24 + hours) * 60 + minutes) * 60 + seconds;
};

export const formatRunTime = (moving_time: string): string => {
  const totalSeconds = convertMovingTime2Sec(moving_time);
  const seconds = totalSeconds % 60;
  const minutes = (totalSeconds - seconds) / 60;
  if (minutes > 60) {
    const hours = (minutes - (minutes % 60)) / 60;
    return hours + "h " + (minutes % 60) + "min";
  }
  if (minutes === 0) {
    return seconds + "s";
  }
  return minutes + "min";
};

export const titleForRun = (run: Activity): string => {
  const runDistance = run.distance / 1000;
  const runHour = +run.start_date_local.slice(11, 13);
  if (run.type === "VirtualRide") {
    return run.name;
  }
  if (run.type === "Run") {
    if (runDistance > 20 && runDistance < 40) {
      return RUN_TITLES.HALF_MARATHON_RUN_TITLE;
    }
    if (runDistance >= 40) {
      return RUN_TITLES.FULL_MARATHON_RUN_TITLE;
    }
  }
  // other workouts
  let msg = "";
  if (runHour >= 0 && runHour <= 10) {
    msg = RUN_TITLES.MORNING_RUN_TITLE;
  } else if (runHour > 10 && runHour <= 14) {
    msg = RUN_TITLES.MIDDAY_RUN_TITLE;
  } else if (runHour > 14 && runHour <= 18) {
    msg = RUN_TITLES.AFTERNOON_RUN_TITLE;
  } else if (runHour > 18 && runHour <= 21) {
    msg = RUN_TITLES.EVENING_RUN_TITLE;
  } else {
    msg = RUN_TITLES.NIGHT_RUN_TITLE;
  }
  return msg.replace("Run", run.type);
};

export const formatLocationCountry = (location_country: string | null) => {
  if (!location_country) {
    return "-";
  }
  if (location_country.startsWith("{")) {
    try {
      location_country = location_country.replace(/'/g, '"');
      location_country = location_country.replaceAll("None", '""');
      const lc = JSON.parse(location_country);
      if ((lc as LocationCountry).city) {
        return [lc.district, lc.city, lc.country].filter(Boolean).join(", ");
      }
    } catch (e) {
      showFailureToast(e);
    }
  }

  const split = location_country.split(",");
  let result = "";
  for (let i = 0; i < Math.min(split.length, 3); i++) {
    result += split[i] + ", ";
  }
  return result.slice(0, -2);
};

export const getOwnerAndRepository = (repository: string) => {
  const [owner, repo] = repository.split("/");
  return { owner, repo };
};

export const sortDateFunc = (a: Activity, b: Activity) => {
  return (
    new Date(b.start_date_local.replace(" ", "T")).getTime() - new Date(a.start_date_local.replace(" ", "T")).getTime()
  );
};

export const getAllDistance = (activities: Activity[], type: string, interval: number): string => {
  const filtered = filterActivities(activities, type, interval);
  const distance = filtered.reduce((acc, cur) => acc + cur.distance, 0);
  return (distance / 1000.0).toFixed(0) + " km";
};

export const filterActivities = (activities: Activity[], type: string | null, interval: number): Activity[] => {
  let filtered = activities.filter((activity) => (type ? activity.type === type : true));
  if (interval != -1) {
    const now = new Date();
    const start = new Date(now.getTime() - interval * 24 * 60 * 60 * 1000);
    filtered = filtered.filter((activity) => {
      const date = new Date(activity.start_date_local);
      return date >= start && date <= now;
    });
  }
  return filtered;
};
