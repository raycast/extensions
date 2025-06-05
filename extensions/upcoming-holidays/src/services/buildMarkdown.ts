import { format, formatDistanceToNow, isAfter } from "date-fns";
import { TranslatedHoliday } from "../types";

export const buildMarkdown = (
  holidays: TranslatedHoliday[],
  opts?: {
    startDate?: boolean;
    relativeDate?: boolean;
    reverse?: boolean;
    relativeOrdering?: boolean;
  },
) => {
  const showStartDate = opts?.startDate ?? false;
  const useRelativeDate = opts?.relativeDate ?? true;

  let sortedHolidays = holidays;

  if (opts?.relativeOrdering) {
    const now = new Date();
    const upcomingHolidays: TranslatedHoliday[] = [];
    const pastHolidays: TranslatedHoliday[] = [];

    sortedHolidays.forEach((holiday) => {
      const holidayDate = new Date(holiday.start);
      if (isAfter(holidayDate, now)) {
        upcomingHolidays.push(holiday);
      } else {
        pastHolidays.push(holiday);
      }
    });

    const sortByStartDate = (a: TranslatedHoliday, b: TranslatedHoliday) => {
      return a.start > b.start ? 1 : -1; // Simple comparison for sorting
    };
    upcomingHolidays.sort(sortByStartDate);
    pastHolidays.sort(sortByStartDate);
    sortedHolidays = [...upcomingHolidays, ...pastHolidays];
  }

  if (opts?.reverse) {
    sortedHolidays = sortedHolidays.reverse();
  }

  return sortedHolidays
    .map(({ start, name, englishName }) => {
      const date = new Date(start);
      const formattedDate = format(date, "EEEE, MMMM Do");
      const relativeDate = formatDistanceToNow(date, { addSuffix: true }); // Use date-fns for relative date

      let dateInfo = "";
      if (showStartDate) {
        dateInfo = `(Started ${relativeDate})`;
      } else if (useRelativeDate) {
        dateInfo = `(${relativeDate})`;
      }

      return `
### ${englishName ? `${englishName} (${name})` : name}
${formattedDate} ${dateInfo}
`;
    })
    .join("\n\n");
};
