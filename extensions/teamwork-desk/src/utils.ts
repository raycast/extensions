import { ImageMask } from "@raycast/api";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

const numberFormatter = new Intl.NumberFormat("en-US", { notation: "compact", compactDisplay: "short" });

export function formatDate(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  return timeAgo.format(date, "round") as string;
}
