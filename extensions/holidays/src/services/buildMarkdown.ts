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
    const upcomingHolidays = sortedHolidays.filter((holiday) => moment(holiday.start).isSameOrAfter(now));
    const pastHolidays = sortedHolidays.filter((holiday) => moment(holiday.start).isBefore(now));

    upcomingHolidays.sort((a, b) => moment(a.start).diff(moment(b.start)));
    pastHolidays.sort((a, b) => moment(a.start).diff(moment(b.start)));
    sortedHolidays = [...upcomingHolidays, ...pastHolidays];
  }

  if (opts?.reverse) {
    sortedHolidays = sortedHolidays.reverse();
  }

  return sortedHolidays
    .map(
      ({ start, name, englishName }) => `
### ${englishName ? `${englishName} (${name})` : name}

${moment(start).format("dddd, MMMM Do")} ${showStartDate ? `(Started ${moment(start).fromNow()})` : ""} ${useRelativeDate ? `(${moment(start).fromNow()})` : ""}
`,
    )
    .join("\n\n");
};
