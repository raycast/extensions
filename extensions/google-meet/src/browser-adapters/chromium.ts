import type { SupportedBrowsers } from "../utils/scripts";
import { createStandardTabsAdapter } from "./standard-tabs";
import type { MeetingUrlSource } from "./types";

export function createChromiumAdapter(appName: SupportedBrowsers): MeetingUrlSource {
  return createStandardTabsAdapter(appName);
}
