import { format, subDays, subMonths, subWeeks, subYears } from "date-fns";

export const DISCUSSION_SORT_TYPES_TO_QUERIES = [
  { title: "Latest Activity", value: "sort:latest" },
  { title: "Date Created", value: "sort:date_created" },
  { title: "Top: Past Day", value: "sort:top created:>=1d" },
  { title: "Top: Past Week", value: "sort:top created:>=1w" },
  { title: "Top: Past Month", value: "sort:top created:>=1m" },
  { title: "Top: Past Year", value: "sort:top created:>=1y" },
  { title: "Top: All", value: "sort:top" },
];
export const DISCUSSION_DEFAULT_SORT_QUERY = DISCUSSION_SORT_TYPES_TO_QUERIES[0].value;

export const formatDateForQuery = (input: string): string => {
  const date = new Date();
  let adjustedDate;

  const match = input.match(/sort:top created:>=(\d+)([dwmy])/);

  if (!match) {
    return input;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d":
      adjustedDate = subDays(date, value);
      break;
    case "w":
      adjustedDate = subWeeks(date, value);
      break;
    case "m":
      adjustedDate = subMonths(date, value);
      break;
    case "y":
      adjustedDate = subYears(date, value);
      break;
    default:
      throw new Error("Unsupported time unit");
  }

  const formattedDate = format(adjustedDate, "yyyy-MM-dd");
  return `sort:top created:>=${formattedDate}`;
};
