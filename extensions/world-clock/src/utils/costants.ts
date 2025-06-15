import { Icon } from "@raycast/api";

const BASE_URL = "https://www.timeapi.io";
export const API_ALL_TIMEZONE = BASE_URL + "/api/timezone/availabletimezones";
export const API_CURRENT_TIME = BASE_URL + "/api/time/current/zone";
export const API_TIMEZONE_BY_ZONE = BASE_URL + "/api/timezone/zone";
export const API_TIMEZONE_BY_IP = BASE_URL + "/api/timezone/ip";
export const API_IP_GEOLOCATION = "http://ip-api.com/json/";

export enum localStorageKey {
  STAR_TIMEZONE = "StarTimeZone",
  SHOW_DETAILS = "ShowDetails",
}

export const filterTag = [
  { title: "All", value: "All", icon: Icon.Globe },
  { title: "Starred", value: "Starred", icon: Icon.Stars },
  { title: "Other", value: "Other", icon: Icon.Ellipsis },
];

export const icons = Object.values(Icon);

export const TIME_SECOND_TO_HOUR = 60 * 60;
