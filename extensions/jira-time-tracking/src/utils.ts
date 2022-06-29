import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export const toSeconds = (seconds: number, minutes: number, hours: number) => seconds + minutes * 60 + hours * 3600;

const prefs = getPreferenceValues<Preferences>();

export const createJiraUrl = (endpoint: string) => `https://${prefs.domain}${endpoint}`;

// Jira doesn't like the trailing Z UTC identifier
export const parseDate = (date: Date) => date.toISOString().replace("Z", "+0000");

export const createTimeLogSuccessMessage = (issueKey: string, hours?: string, minutes?: string, seconds?: string) =>
  `You logged ${Number(hours) ? hours + " hours " : ""}${Number(minutes) ? minutes + " minutes " : ""}${
    Number(seconds) ? seconds + " seconds" : ""
  } against ${issueKey}`;
