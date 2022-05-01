import { sub } from "date-fns";
import { useEffect, useState } from "react";

import { getSummary } from "../utils";

export function useSummary(range = "all", id = "current") {
  const ranges: Record<string, Date> = {
    Today: sub(new Date(), { days: 1 }),
    "Last 7 Days": sub(new Date(), { days: 7 }),
    "Last 30 Days": sub(new Date(), { days: 30 }),
    "Last 6 Months": sub(new Date(), { months: 6 }),
    "Last Year": sub(new Date(), { years: 1 }),
  };
  const [isLoading, setIsLoading] = useState<boolean>();
  const [data, setData] = useState<Array<readonly [string, WakaTime.Summary]>>();

  useEffect(() => {
    async function getData() {
      setIsLoading(true);
      const dateRanges = range === "all" ? Object.entries(ranges) : [[range, ranges[range]] as const];
      setData(await Promise.all(dateRanges.map(async ([key, range]) => [key, await getSummary(range, id)] as const)));
      setIsLoading(false);
    }

    getData();
  }, []);

  return { data, isLoading };
}
