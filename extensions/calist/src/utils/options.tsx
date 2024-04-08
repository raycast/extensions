import { getPreferenceValues } from "@raycast/api";

// Week Settings
export const weekFormat = Number(getPreferenceValues().weekStart);
export const weekEnable = getPreferenceValues().weekEnable;
export const weekDays = getPreferenceValues().weekDays;

// Month Settings
export const monthDetails = getPreferenceValues().monthDetails;
export const monthName = getPreferenceValues().monthName;
export const monthSignal = getPreferenceValues().monthSignal;
export const monthViewMode = getPreferenceValues().monthViewMode;
export const monthDropdown = getPreferenceValues().monthDropdown;

// Time Settings
export const enableTime = getPreferenceValues().enableTime;
export const enableTimeSeconds = getPreferenceValues().enableTimeSeconds;
export const enableTimeTitle = getPreferenceValues().enableTimeTitle;
export const enableTimeFormat = getPreferenceValues().enableTimeFormat;
export const enableTimeSecondary = getPreferenceValues().enableTimeSecondary;
export const enableTimeSecondaryOffset = getPreferenceValues().enableTimeSecondaryOffset;

//Search
export const searchPlaceholder = getPreferenceValues().searchPlaceholder;

// Window Title
export const navTitle = getPreferenceValues().navTitle;
export const navDate = getPreferenceValues().navDate;
export const navWeather = getPreferenceValues().navWeather;
export const navWeek = getPreferenceValues().navWeek;

// Theme Settings
export const customTheme = getPreferenceValues().customTheme;

// Icon Type
export const iconsType = getPreferenceValues().iconsType;

// Font Settings
export const fontWeight = getPreferenceValues().fontWeight;
export const fontFamily = getPreferenceValues().fontFamily;
export const fontColorAccent = getPreferenceValues().fontColorAccent;
export const fontColorAccentWeekend = getPreferenceValues().fontColorAccentWeekend;
