import { useCachedPromise } from "@raycast/utils";
import { getCalendarList, getReminderList } from "swift:../../swift/AppleReminders";
import { Calendar } from "./useCalendar";
import { CacheKey, CCalendar, CCalendarList, CCalendarType } from "../types/calendar";
import { Cache } from "@raycast/api";
import { ReminderList } from "./useReminders";

function filterCCalendarItem<T extends Calendar | ReminderList>(items: T[], cachedItems: CCalendar[]): CCalendar[] {
  return items
    .filter((item) => cachedItems.some((cachedItem) => cachedItem.id === item.id))
    .map((item) => {
      const cachedItem = cachedItems.find((cachedItem) => cachedItem.id === item.id);
      return {
        id: item.id,
        title: item.title,
        color: item.color,
        source: "source" in item ? item.source : undefined,
        enabled: cachedItem?.enabled || false,
        isDefault: "isDefault" in item ? item.isDefault : cachedItem?.isDefault,
      };
    });
}

function sortBySourceOrTitle(a: CCalendar, b: CCalendar, sortBy: "source" | "title") {
  const valueA = a[sortBy] || "";
  const valueB = b[sortBy] || "";
  return valueA.localeCompare(valueB);
}

function transformCalendarToCCalendar<
  T extends { id: string; title: string; color: string; source?: string; isDefault?: boolean; enabled?: boolean },
>(items: T[], defaultSource?: string, defaultIsDefault?: boolean): CCalendar[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    color: item.color,
    source: item.source || defaultSource,
    isDefault: item.isDefault || defaultIsDefault,
    enabled: item.enabled || true,
  }));
}

async function getConfigureCalendarList(): Promise<CCalendarList[]> {
  let cCalendarList: CCalendar[];
  let cReminderList: CCalendar[];
  const cache = new Cache();
  const calendarListItemsStr = cache.get(CacheKey.CONFIGURE_LIST_ITEMS);

  const rawCalendarList = (await getCalendarList()) as Calendar[];
  const rawReminderList = (await getReminderList()) as ReminderList[];
  if (calendarListItemsStr) {
    let ccListItem: CCalendarList[] = [];
    try {
      ccListItem = JSON.parse(calendarListItemsStr) as CCalendarList[];
    } catch (error) {
      console.error("JSON parsing error:", error);
    }

    // calendar
    cCalendarList = filterCCalendarItem(rawCalendarList, ccListItem[0].list).sort((a, b) =>
      sortBySourceOrTitle(a, b, "source"),
    );

    // 从rawReminderList过滤出存在的list
    cReminderList = filterCCalendarItem(rawReminderList, ccListItem[1].list).sort((a, b) =>
      sortBySourceOrTitle(a, b, "title"),
    );
  } else {
    // calendar
    cCalendarList = transformCalendarToCCalendar(rawCalendarList).sort((a, b) => sortBySourceOrTitle(a, b, "source"));
    // reminder
    cReminderList = transformCalendarToCCalendar(rawReminderList).sort((a, b) => sortBySourceOrTitle(a, b, "title"));
  }
  const ccList: CCalendarList[] = [
    { type: CCalendarType.CALENDAR, list: cCalendarList },
    { type: CCalendarType.REMINDER, list: cReminderList },
  ];
  cache.set(CacheKey.CONFIGURE_LIST_ITEMS, JSON.stringify(ccList));
  return ccList;
}

export function useCCalendarList() {
  return useCachedPromise(() => {
    try {
      return getConfigureCalendarList() as Promise<CCalendarList[]>;
    } catch (e) {
      console.error("Failed to fetch calendar events:", e);
      return Promise.resolve([] as CCalendarList[]);
    }
  });
}
