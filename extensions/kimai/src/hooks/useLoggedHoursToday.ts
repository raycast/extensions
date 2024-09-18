import { useCachedPromise } from "@raycast/utils";
import { getLoggedHoursToday } from "../libs/api";

export const useLoggedHoursToday = () => {
  const { isLoading, data } = useCachedPromise(getLoggedHoursToday, [], {
    keepPreviousData: true,
  });

  return { isLoading, hours: data };
};
