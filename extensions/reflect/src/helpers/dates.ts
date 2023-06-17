import { format } from "date-fns";

//Return the current date as an ISO string without the time (which is what the Reflect API expects)
export function getTodaysDateAsISOString() {
  return format(new Date(), "yyyy-MM-dd");
}

interface Preferences {
  prependTimestamp?: boolean;
}

export function prependTimestampIfSelected(text: string, preferences: Preferences) {
  if (preferences.prependTimestamp) {
    const timestamp = format(new Date(), "h:maaa");
    text = `${timestamp} ${text}`;
  }
  return text;
}
