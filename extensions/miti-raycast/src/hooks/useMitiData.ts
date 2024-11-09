import { useFetch } from "@raycast/utils";
import { nepaliMonth, nepaliYear } from "../utils/calendar-utils";

export const useMitiData = () => {
  const { isLoading, data } = useFetch(
    `https://data.miti.bikram.io/data/${nepaliYear}/${Number(nepaliMonth + 1)
      .toString()
      .padStart(2, "0")}.json`,
    {
      keepPreviousData: true,
    },
  );
  return { isLoading, data };
};
