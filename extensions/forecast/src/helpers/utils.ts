import { Color, Icon } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { ForecastEntry } from "../types";

dayjs.extend(duration);

export function getEntryIcon(entry: ForecastEntry) {
  if (entry.isDone) {
    return { source: Icon.Checkmark, tintColor: Color.Green };
  }

  const hours = dayjs.duration(entry.allocation, "seconds").asHours();
  const progress = Math.min(hours / 7, 1);

  let tintColor = Color.Yellow;
  if (hours > 3.5 && hours <= 7) {
    tintColor = Color.Orange;
  } else if (hours > 7) {
    tintColor = Color.Red;
  }

  return getProgressIcon(progress, tintColor);
}

export function getHostname(url: string): string {
  try {
    if (url.startsWith("//")) {
      return new URL(`https:${url}`).hostname.replace("www.", "");
    }
    if (url.startsWith("http")) {
      return new URL(url).hostname.replace("www.", "");
    }
    return new URL(`https://${url}`).hostname.replace("www.", "");
  } catch {
    return url;
  }
}
