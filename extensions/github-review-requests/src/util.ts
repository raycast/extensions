import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { environment, LaunchType } from "@raycast/api";

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

export function formatDate(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  return timeAgo.format(date, "twitter") as string;
}

export const getTimestampISOInSeconds = () => new Date().toISOString().substring(0, 19) + "Z";

export const isActionUserInitiated = () => {
  const userInitiated = environment.launchType === LaunchType.UserInitiated;

  console.debug(`isActionUserInitiated: ${userInitiated}`);

  return userInitiated;
};
