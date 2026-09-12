import { navTitle, navWeather, navWeek, navDate } from "u/options";
import getWeather from "u/weather";

const getCurrentWeekOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  return Math.ceil(dayOfYear / 7);
};

export const useTitle = () => {
  const WEATHER: string = navWeather ? getWeather("temperature") ?? "" : "";

  const CURRENT_DAY = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const CURRENT_WEEK = getCurrentWeekOfYear();

  const DATE = navDate ? CURRENT_DAY : "";
  const WEEK = navWeek ? CURRENT_WEEK : "";

  const TITLE = [WEATHER, DATE, WEEK].filter(Boolean);

  if (navTitle) {
    return navTitle;
  } else {
    return TITLE.join("   ·   ");
  }
};
