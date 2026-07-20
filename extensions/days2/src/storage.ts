import { LocalStorage } from "@raycast/api";

const SELECTED_CALENDARS_KEY = "selected-calendar-ids";

export async function getSelectedCalendarIds(): Promise<string[] | null> {
  const raw = await LocalStorage.getItem<string>(SELECTED_CALENDARS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function setSelectedCalendarIds(ids: string[]): Promise<void> {
  await LocalStorage.setItem(SELECTED_CALENDARS_KEY, JSON.stringify(ids));
}

export async function toggleCalendarSelection(
  calendarId: string,
  allCalendarIds: string[],
): Promise<string[]> {
  let currentIds = await getSelectedCalendarIds();

  if (currentIds === null) {
    currentIds = [...allCalendarIds];
  }

  const isSelected = currentIds.includes(calendarId);
  let newIds: string[];

  if (isSelected) {
    if (currentIds.length <= 1) {
      return currentIds;
    }
    newIds = currentIds.filter((id) => id !== calendarId);
  } else {
    newIds = [...currentIds, calendarId];
  }

  await setSelectedCalendarIds(newIds);
  return newIds;
}
