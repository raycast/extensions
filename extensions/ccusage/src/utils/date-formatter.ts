import { format } from "date-fns";

export const getCurrentLocalDate = (): string => {
  return format(new Date(), "yyyy-MM-dd");
};

export const getCurrentLocalMonth = (): string => {
  return format(new Date(), "yyyy-MM");
};
