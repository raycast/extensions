import { useCachedPromise } from "@raycast/utils";

import { fetchPublicHolidays } from "../utils/countries";

export function useHolidays(countryCode: string) {
  const year = new Date().getFullYear();

  const { data, isLoading, error } = useCachedPromise(fetchPublicHolidays, [year, countryCode], {
    initialData: [] as string[],
  });

  return {
    holidays: new Set<string>(data ?? []),
    holidayCount: data?.length ?? 0,
    isLoading,
    error,
  };
}
