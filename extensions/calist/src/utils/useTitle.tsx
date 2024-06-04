import { getDayName, getMonthName } from "u/getName";
import { getCurrentDay, getCurrentMonth, getCurrentYear, getCurrentWeek } from "u/getDate";
import { navTitle, navWeather, navWeek, navDate } from "u/options";

import getWeather from "u/weather";
interface TitleProps {
  month?: number;
  year?: number;
  week?: number;
  day?: number;
  weather?: boolean;
}

export const useTitle = ({ month, year, week, day, weather }: TitleProps = {}) => {
  const getDay = day || getCurrentDay().dayNumber;
  const getMonthNumber = month || getCurrentMonth().monthNumber;
  const getYear = navDate ? year || getCurrentYear() : "";
  const getWeek = week || getCurrentWeek();
  const getForecast = weather ? getWeather() : "";

  const weatherString: string = navWeather ? getForecast ?? "" : "";
  const dateStr: string = navDate ? `${getDayName(getDay)} ${getDay}, ${getMonthName(getMonthNumber)} ${getYear}` : "";
  const weekString: string = navWeek ? `${getWeek}` : "";

  const titleParts = [weatherString, dateStr, weekString].filter(Boolean);

  if (navTitle) {
    return navTitle;
  } else {
    return titleParts.join("   ·   ");
  }
};
