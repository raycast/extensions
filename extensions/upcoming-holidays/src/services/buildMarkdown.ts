import moment from "moment";
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
    const now = moment();
    const upcomingHolidays: TranslatedHoliday[] = [];
    const pastHolidays: TranslatedHoliday[] = [];

    sortedHolidays.forEach((holiday) => {
      const holidayMoment = moment(holiday.start);
      if (holidayMoment.isSameOrAfter(now)) {
        upcomingHolidays.push(holiday);
      } else {
        pastHolidays.push(holiday);
      }
    });

    const sortByStartDate = (a: TranslatedHoliday, b: TranslatedHoliday) => moment(a.start).diff(moment(b.start));
    upcomingHolidays.sort(sortByStartDate);
    pastHolidays.sort(sortByStartDate);
    sortedHolidays = [...upcomingHolidays, ...pastHolidays];
  }

  if (opts?.reverse) {
    sortedHolidays = sortedHolidays.reverse();
  }

  return sortedHolidays
    .map(({ start, name, englishName }) => {
      const date = moment(start);
      const formattedDate = date.format("dddd, MMMM Do");
      const relativeDate = date.fromNow();

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
