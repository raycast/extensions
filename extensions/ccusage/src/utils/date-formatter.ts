import { format, startOfISOWeek } from "date-fns";

export const getCurrentLocalDate = (): string => format(new Date(), "yyyy-MM-dd");

export const getCurrentLocalMonth = (): string => format(new Date(), "yyyy-MM");

// `ccusage weekly` keys each row by the ISO-week Monday in `YYYY-MM-DD`.
export const getCurrentWeekStart = (): string => format(startOfISOWeek(new Date()), "yyyy-MM-dd");
