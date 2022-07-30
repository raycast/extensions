import { showToast, Toast } from "@raycast/api";
import { sub } from "date-fns";
import { useEffect, useState } from "react";

import { getSummary } from "../utils";

export function useSummary() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<Array<readonly [string, WakaTime.Summary]>>();

  useEffect(() => {
    const ranges: Array<[Range, Date]> = [
      ["Today", new Date()],
      ["Yesterday", sub(new Date(), { days: 1 })],
      ["Last 7 Days", sub(new Date(), { days: 7 })],
      ["Last 30 Days", sub(new Date(), { days: 30 })],
    ];

    async function getData() {
      setIsLoading(true);

      try {
        const summaries = ranges.map(async ([key, date]) => {
          const summary = await getSummary(key, date);
          if (summary.ok) return [key, summary] as const;
        });

        const data = await Promise.all(summaries);
        setData(data.filter(Boolean) as NonNullable<typeof data[number]>[]);
      } catch (error) {
        await showToast(Toast.Style.Failure, "Error Loading Summary", (error as Error).message);
      }

      setIsLoading(false);
    }

    void getData();
  }, []);

  return { data, isLoading };
}

type Range = "Today" | "Yesterday" | "Last 7 Days" | "Last 30 Days";
