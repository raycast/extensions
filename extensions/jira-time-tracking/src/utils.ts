import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export const parseTimeToSeconds = (input: string) => {
  const regex = /(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/;
  const matches = input.match(regex);
  if (matches) {
    const hours = parseInt(matches[1], 10) || 0;
    const minutes = parseInt(matches[2], 10) || 0;
    const seconds = parseInt(matches[3], 10) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0; // Return 0 if the input doesn't match the expected format
};

const prefs = getPreferenceValues<Preferences>();

export const createJiraUrl = (endpoint: string) => `https://${prefs.domain}${endpoint}`;

// Jira doesn't like the trailing Z UTC identifier
export const parseDate = (date: Date) => date.toISOString().replace("Z", "+0000");

export const createTimeLogSuccessMessage = (issueKey: string, seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  let message = `You logged `;
  if (hours > 0) message += `${hours} hour(s) `;
  if (minutes > 0) message += `${minutes} minute(s) `;
  if (remainingSeconds > 0) message += `${remainingSeconds} second(s) `;
  message += `against ${issueKey}.`;

  return message;
};
