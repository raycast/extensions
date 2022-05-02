import { showToast, Toast } from "@raycast/api";
import { sub } from "date-fns";
import { useEffect, useState } from "react";

import { getSummary } from "../utils";

export function useSummary() {
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

      try {
        const data = await Promise.all(rangeOrder.map(async (v) => [v, await getSummary(v, ranges[v])] as const));
        setData(data);
      } catch (error) {
        await showToast(Toast.Style.Failure, "Error Loading Summary", (error as Record<string, string>).message);
      }

      setIsLoading(false);
    }

    getData();
  }, []);

  return { data, isLoading };
}

type Range = "Today" | "Yesterday" | "Last 7 Days" | "Last 30 Days" | "Last 6 Months" | "Last Year";
