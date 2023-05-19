import { getApplications } from "@raycast/api";
import { format } from "date-fns";

export const reflectDownload = "https://reflect.app/download";

export async function checkReflect() {
  const apps = await getApplications();
  const reflectInstalled = apps.find((app) => app.bundleId === "app.reflect.ReflectDesktop");
  if (reflectInstalled) return true;

  return false;
}

//Return the current date as an ISO string without the time (which is what the Reflect API expects)
export function getTodaysDateAsISOString() {
  return format(new Date(), "yyyy-MM-dd");
}

export function applyTextTransform(text: string, preferences: Preferences.QuickAppend) {
  if (preferences.prependTimestamp) {
    const timestamp = format(new Date(), "h:maaa");
    text = `${timestamp} ${text}`;
  }
  return text;
}
