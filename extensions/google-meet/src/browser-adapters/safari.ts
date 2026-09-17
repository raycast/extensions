import { createStandardTabsAdapter } from "./standard-tabs";
import type { MeetingUrlSource } from "./types";

export function createSafariAdapter(): MeetingUrlSource {
  return createStandardTabsAdapter("Safari");
}
