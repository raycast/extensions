import { format } from "date-fns";

//Return the current date as an ISO string without the time (which is what the Reflect API expects)
export function getTodaysDateAsISOString() {
  return format(new Date(), "yyyy-MM-dd");
}

interface Preferences {
  prependTimestamp?: boolean;
  timestampFormat?: "12" | "24";
  isTask?: boolean;
}

export function prependNote(text: string, preferences: Preferences) {
  if (preferences.prependTimestamp) {
    const timestamp = format(new Date(), preferences.timestampFormat === "24" ? "HH:mm" : "h:mmaaa");
    text = `${timestamp} ${text}`;
  }
  if (preferences.isTask) {
    text = `+ ${text}`;
  }
  return text;
}
