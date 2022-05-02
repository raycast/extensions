import { sub } from "date-fns";
import { useEffect, useState } from "react";

import { getSummary } from "../utils";

export function useSummary(range: Range | "all" = "all", id = "current") {
  const rangeOrder: Range[] = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "Last 6 Months", "Last Year"];
  const ranges: Record<Range, Date> = {
    Today: new Date(),
    Yesterday: sub(new Date(), { days: 1 }),
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
      await Promise.all(
        dateRanges.map(async ([key, date]) => {
          const summary = await getSummary(date, id);
          setData((data = []) => {
            const newData = [...data];
            newData.splice(rangeOrder.indexOf(key as Range), 0, [key, summary]);
            return newData;
          });
        })
      );
      setIsLoading(false);
    }

    getData();
  }, []);

  return { data, isLoading };
}

type Range = "Today" | "Yesterday" | "Last 7 Days" | "Last 30 Days" | "Last 6 Months" | "Last Year";
