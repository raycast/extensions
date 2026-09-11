import { useCachedPromise } from "@raycast/utils";
import { getLoggedHoursToday, getLoggedHoursThisWeek, getLoggedHoursThisMonth } from "../libs/api";

export const useLoggedHoursToday = () => {
  const { isLoading: isLoadingToday, data: hoursToday } = useCachedPromise(getLoggedHoursToday, [], {
    keepPreviousData: true,
  });

  const { isLoading: isLoadingWeek, data: hoursWeek } = useCachedPromise(getLoggedHoursThisWeek, [], {
    keepPreviousData: true,
  });

  const { isLoading: isLoadingMonth, data: hoursMonth } = useCachedPromise(getLoggedHoursThisMonth, [], {
    keepPreviousData: true,
  });

  return {
    isLoading: isLoadingToday || isLoadingWeek || isLoadingMonth,
    hoursToday,
    hoursWeek,
    hoursMonth,
  };
};
