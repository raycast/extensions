import { getPreferenceValues } from "@raycast/api";

export const formatTimeRange = (start: Date, end: Date) => {
  const format = (date: Date) => {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  return `${format(start)} - ${format(end)}`;
};

export const toTitleCase = (str: string) => {
  return str.replace(/\w\S*/g, (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase());
};

export type Preferences = {
  url: string;
  school: string;
  schoolNumber: string;
  username: string;
  key: string;
};

export const useSettings = () => {
  return getPreferenceValues<Preferences>();
};
