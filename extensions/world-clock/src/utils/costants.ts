import { Icon } from "@raycast/api";

export const TIMEZONE_BASE_URL = "https://worldtimeapi.org/api/timezone";
export const IP_BASE_URL = "http://worldtimeapi.org/api/ip/";
export const IP_GEOLOCATION_API = "http://ip-api.com/json/";

export enum localStorageKey {
  STAR_TIMEZONE = "StarTimeZone",
  TIMEZONE_CACHE = "TimezoneCache",
  SHOW_DETAILS = "ShowDetails",
}

export const filterTag = [
  { title: "All", value: "All", icon: Icon.Globe },
  { title: "Starred", value: "Starred", icon: Icon.Stars },
  { title: "Other", value: "Other", icon: Icon.Ellipsis },
];

export const weeks = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const icons = Object.values(Icon);
