import { showToast, Toast } from "@raycast/api";
import { sub } from "date-fns";
import { useEffect, useState } from "react";

import { getSummary } from "../utils";

export function useSummary() {
  const rangeOrder: Range[] = ["Today", "Yesterday", "Last 7 Days", "Last 30 Days"];
  const ranges: Record<Range, Date> = {
    Today: new Date(),
    Yesterday: sub(new Date(), { days: 1 }),
    "Last 7 Days": sub(new Date(), { days: 7 }),
    "Last 30 Days": sub(new Date(), { days: 30 }),
  };
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<Array<readonly [string, WakaTime.Summary]>>();

  useEffect(() => {
    async function getData() {
      setIsLoading(true);

      try {
        await Promise.all(
          rangeOrder.map(async (range, idx) => {
            const summary = await getSummary(range, ranges[range]);
            if (!summary.ok) throw new Error(summary.error);

            setData((data = []) => {
              const d = [...data];
              d.splice(idx, 0, [range, summary] as const);
              return d;
            });
          })
        );
      } catch (error) {
        await showToast(Toast.Style.Failure, "Error Loading Summary", (error as Record<string, string>).message);
      }

      setIsLoading(false);
    }

    getData();
  }, []);

  return { data, isLoading };
}

type Range = "Today" | "Yesterday" | "Last 7 Days" | "Last 30 Days";
