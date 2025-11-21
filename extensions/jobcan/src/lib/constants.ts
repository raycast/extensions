import { Icon, Color } from "@raycast/api";
import { AttendanceStatus } from "./types";

// Jobcan API Constants
export const CLIENT_ID = "BhMffo7y3w3pMipg9Q4Z1jERl9LQZLGrtkV1w55e";

// Base URLs
export const ID_BASE_URL = "https://id.jobcan.jp";
export const SSL_BASE_URL = "https://ssl.jobcan.jp";

// Derived URLs
export const REDIRECT_URI = `${SSL_BASE_URL}/jbcoauth/callback`;

// Cache TTL (in milliseconds)
export const CACHE_TTL = {
  ATTENDANCE: 5 * 60 * 1000, // 5 minutes
  SESSION: 24 * 60 * 60 * 1000, // 24 hours (session cookie expiry)
} as const;

// LocalStorage keys
export const STORAGE_KEYS = {
  SESSION_COOKIE: "jobcan_session_cookie",
  SESSION_COOKIES: "jobcan_session_cookies",
  SESSION_EXPIRY: "jobcan_session_expiry",
  CLOCK_FIELDS_SCHEMA: "jobcan_clock_fields_schema",
  CLOCK_FIELD_VALUE_PREFIX: "jobcan_clock_field_value_",
} as const;

// External URLs
export const GITHUB_ISSUES_URL = "https://github.com/raycast/extensions/issues/new/choose";

// Icon Pack Map
// Maps each attendance status to icons for different icon packs
export const ICON_PACK_MAP: Record<
  AttendanceStatus,
  {
    raycast: Icon | string | { source: string; tintColor?: Color };
    pduck: string;
    gif: string;
  }
> = {
  [AttendanceStatus.Pending]: {
    raycast: Icon.Hourglass,
    pduck: "icons/pduck/pduck-sitting.png",
    gif: "icons/gif/waiting.gif",
  },
  [AttendanceStatus.Logged]: {
    raycast: Icon.Check,
    pduck: "icons/pduck/pduck-green.png",
    gif: "icons/gif/typing-cat.gif",
  },
  [AttendanceStatus.HolidayWork]: {
    raycast: Icon.Check,
    pduck: "icons/pduck/pduck-injured.png",
    gif: "icons/gif/this-is-fine.gif",
  },
  [AttendanceStatus.Absence]: {
    raycast: Icon.ExclamationMark,
    pduck: "icons/pduck/pduck-excl.gif",
    gif: "icons/gif/confused-travolta.gif",
  },
  [AttendanceStatus.Late]: {
    raycast: Icon.ExclamationMark,
    pduck: "icons/pduck/pduck-excl.gif",
    gif: "icons/gif/confused-travolta.gif",
  },
  [AttendanceStatus.PaidVacation]: {
    raycast: Icon.Check,
    pduck: "icons/pduck/pduck-blue.png",
    gif: "icons/gif/cool-doge.gif",
  },
  [AttendanceStatus.SubstitutionHoliday]: {
    raycast: Icon.Check,
    pduck: "icons/pduck/pduck-blue.png",
    gif: "icons/gif/cool-doge.gif",
  },
  [AttendanceStatus.Holiday]: {
    raycast: Icon.Circle,
    pduck: "icons/pduck/pduck-black.png",
    gif: "icons/gif/homer.gif",
  },
  [AttendanceStatus.Unlogged]: {
    raycast: Icon.Circle,
    pduck: "icons/pduck/pduck-black.png",
    gif: "icons/gif/homer.gif",
  },
};
