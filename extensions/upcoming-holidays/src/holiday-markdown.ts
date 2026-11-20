import { differenceInCalendarDays, format } from "date-fns";
import type { Holiday } from "./api";

const relativeDayFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export const buildMarkdown = (holidays: Holiday[] | undefined, now = new Date()) => {
  if (!holidays || holidays.length === 0) return "";

  return holidays
    .map(({ date, name }) => {
      const days = differenceInCalendarDays(date, now);
      const relativeDate = relativeDayFormatter.format(days, "day");
      // Avoid leading indentation so markdown doesn't render as a code block.
      return `### ${name}\n\n${format(date, "EEEE, MMMM do")} (${relativeDate})`;
    })
    .join("\n\n");
};
