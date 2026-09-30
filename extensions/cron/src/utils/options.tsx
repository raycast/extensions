import { getPreferenceValues } from "@raycast/api";

// Week Settings
export const weekFormat = getPreferenceValues().weekFormat || "monday";
export const weekEnable = getPreferenceValues().weekEnable || false;
export const weekDays = getPreferenceValues().weekDays || "";

// Month Settings
export const monthDetails = getPreferenceValues().monthDetails || "";
export const monthName = getPreferenceValues().monthName || "";
export const monthSignal = getPreferenceValues().monthSignal || "";
export const monthViewMode = getPreferenceValues().monthViewMode || "";
export const monthDropdown = getPreferenceValues().monthDropdown || "";

// Time Settings
export const enableTime = getPreferenceValues().enableTime || false;
export const enableTimeSeconds = getPreferenceValues().enableTimeSeconds || false;
export const enableTimeTitle = getPreferenceValues().enableTimeTitle || false;
export const enableTimeFormat = getPreferenceValues().enableTimeFormat || false;
export const enableTimeSecondary = getPreferenceValues().enableTimeSecondary || false;
export const enableTimeSecondaryOffset = getPreferenceValues().enableTimeSecondaryOffset || 0;

//Search
export const searchPlaceholder = getPreferenceValues().searchPlaceholder || "";

// Window Title
export const navTitle = getPreferenceValues().navTitle || "";
export const navDate = getPreferenceValues().navDate || "";
export const navWeather = getPreferenceValues().navWeather || "";
export const navWeek = getPreferenceValues().navWeek || "";

// Theme Settings
export const customTheme = getPreferenceValues().customTheme || "";

// Icon Type
export const iconsType = getPreferenceValues().iconsType || "";

// Font Settings
export const fontWeight = getPreferenceValues().fontWeight || "";
export const fontFamily = getPreferenceValues().fontFamily || "";
export const fontColorAccent = getPreferenceValues().fontColorAccent || "";
export const fontColorAccentWeekend = getPreferenceValues().fontColorAccentWeekend || "";
