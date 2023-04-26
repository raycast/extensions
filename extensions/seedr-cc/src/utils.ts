import { getPreferenceValues } from "@raycast/api";

interface Prefrence {
  cookie: string;
}

export const stringToDate = (date: string) => {
  return new Date(date);
};

export const getTimestamp = () => {
  const timestamp = new Date().toISOString().replace("T", "+").slice(0, -5);
  return timestamp;
};

export const bytesToSize = (bytes: number) => {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Byte";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
};

export function getCookie(): string {
  const pref = getPreferenceValues<Prefrence>();
  return pref.cookie;
}
