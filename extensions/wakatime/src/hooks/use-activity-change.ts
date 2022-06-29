import { showToast, Toast } from "@raycast/api";
import { subDays } from "date-fns";
import { useState, useEffect } from "react";

import { getSummary, getDuration } from "../utils";

export function useActivityChange() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState({ emoji: "", percent: 0, duration: "" });

  useEffect(() => {
    async function getData() {
      setIsLoading(true);

      try {
        const data = await getSummary("Last 1 Day", subDays(new Date(), 1));

        if (!data.ok) throw new Error(data.error);
        const days = Object.fromEntries(
          data.data.map((day) => [day.range.text.toLowerCase(), day.grand_total.total_seconds])
        );

        const timeDiff = Math.abs(days.today - days.yesterday);
        const [quantifier, emoji] = days.today <= days.yesterday ? ["less", "⬇️"] : ["more", "⬆️"];

        setData({
          emoji,
          percent: Math.floor((timeDiff / days.yesterday) * 1e2),
          duration: `You've spent ${getDuration(timeDiff)} ${quantifier} compared to yesterday`,
        });
      } catch (error) {
        await showToast(
          Toast.Style.Failure,
          "Error Loading Activity Change",
          (error as Record<string, string>).message
        );
      }

      setIsLoading(false);
    }

    getData();
  }, []);

  return { data, isLoading };
}
