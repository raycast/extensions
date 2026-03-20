import { updateCommandMetadata } from "@raycast/api";

import {
  fetchEvents,
  formatTimeUntil,
  parseEvents,
  writeCache,
} from "./get-next-event";

export default async function RefreshCache() {
  try {
    const raw = fetchEvents();
    writeCache(raw);

    const events = parseEvents(raw);
    const next = events.find((e) => !e.isAllDay) ?? events[0];
    if (next && !next.isAllDay) {
      const timeStr = formatTimeUntil(next.startTimestamp, next.endTimestamp);
      await updateCommandMetadata({
        subtitle: `${next.title} - ${timeStr === "now" || timeStr === "in progress" ? timeStr : `in ${timeStr}`}`,
      });
    } else if (next) {
      await updateCommandMetadata({ subtitle: `${next.title} - all day` });
    } else {
      await updateCommandMetadata({ subtitle: "No upcoming meetings" });
    }
  } catch {
    // Silently fail — next interval will retry
  }
}
