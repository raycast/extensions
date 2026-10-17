import { getCachedCalendars, setCachedCalendars } from "../hooks/useTaskCache";
import { list_calendars, list_colors } from "../utils/tweek-client";

/**
 * Lists all Tweek calendars, their Someday lists, and custom colors available in the user's account.
 * Always call this first if you need a calendarId or someday listId.
 */
export default async function getCalendarsTool() {
  let calendars = getCachedCalendars(false);
  if (!calendars || calendars.length === 0) {
    calendars = await list_calendars();
    setCachedCalendars(calendars);
  }

  const customColors = await list_colors().catch(() => []);

  return {
    calendars: calendars.map((c) => ({
      id: c.id,
      name: c.name,
      isDefault: Boolean(c.isDefault),
      role: c.role || "ROLE_OWNER",
      somedayLists: (c.lists || [])
        .filter((l) => !l.hidden && !l.webHidden)
        .map((l) => ({ id: l.id, name: l.name })),
    })),
    builtInColors: [
      "blank",
      "pink",
      "yellowish",
      "cornflower",
      "mango",
      "greenish",
      "lilac",
      "grey",
      "black",
    ],
    customColors,
  };
}
