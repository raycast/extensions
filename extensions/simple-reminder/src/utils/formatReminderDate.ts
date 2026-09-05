import { format } from "date-fns/format";
import { formatDistance } from "date-fns/formatDistance";
import { MenuBarDateFormat } from "../types/preferences";

const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;

export function formatReminderDate(date: Date, dateFormat: MenuBarDateFormat): string {
  if (dateFormat === "relative" && date.getTime() - new Date().getTime() < TWO_HOURS_IN_MS) {
    return formatDistance(date, new Date(), { addSuffix: true });
  }

  switch (dateFormat) {
    case "short":
      return format(date, "MMM d, HH:mm");
    case "long":
      return format(date, "EEEE, MMMM d yyyy, HH:mm");
    case "iso":
      return format(date, "yyyy-MM-dd HH:mm");
    case "relative":
    default:
      return date.toLocaleString();
  }
}
