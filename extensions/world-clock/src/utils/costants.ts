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
