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
  { title: "All", value: "All" },
  { title: "Starred", value: "Starred" },
  { title: "Other", value: "Other" },
];

export const weeks = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const icons = [
  Icon.TextDocument,
  Icon.Calendar,
  Icon.Clock,
  Icon.Envelope,
  Icon.Globe,
  Icon.List,
  Icon.Star,
  Icon.Terminal,
];

export const clockIcons = [
  "0.svg",
  "1.svg",
  "2.svg",
  "3.svg",
  "4.svg",
  "5.svg",
  "6.svg",
  "7.svg",
  "8.svg",
  "9.svg",
  "10.svg",
  "11.svg",
  "12.svg",
  "13.svg",
  "14.svg",
  "15.svg",
  "16.svg",
  "17.svg",
  "18.svg",
  "19.svg",
  "20.svg",
  "21.svg",
  "22.svg",
  "23.svg",
];
