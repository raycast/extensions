import { addDays, formatISO, isBefore, isSameDay } from "date-fns";
import { largeCalendar } from "../types/preferences";

export function isFullDay(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function getTodayInLocalTime() {
  return formatISO(new Date(), { representation: "date" });
}

export function isOverdue(date: string) {
  return isBefore(date, isFullDay(date) ? getTodayInLocalTime() : new Date());
}

export function isToday(date: string) {
  return isSameDay(date, isFullDay(date) ? getTodayInLocalTime() : new Date());
}

export function isTomorrow(date: string) {
  const today = isFullDay(date) ? getTodayInLocalTime() : new Date();
  return isSameDay(date, addDays(today, 1));
}

export function truncate(str: string, maxLength = largeCalendar ? 30 : 24): string {
  let length = 0;
  let i;
  for (i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    // 判断字符是否为中文字符（Unicode范围）
    if (charCode >= 0x4e00 && charCode <= 0x9fff) {
      length += 2;
    } else {
      length += 1;
    }

    if (length > maxLength) {
      break;
    }
  }

  return str.substring(0, i) + (i < str.length ? "…" : "");
}
