import { subDays } from "date-fns";
import { useCallback } from "react";

import { useBase } from "./base";
import { getSummary } from "../utils";

export function useSummary() {
  const result = useBase({
    handler: useCallback(async () => {
      const summaries = [
        ["Today", new Date()],
        ["Yesterday", subDays(new Date(), 1)],
        ["Last 7 Days", subDays(new Date(), 7)],
        ["Last 30 Days", subDays(new Date(), 30)],
      ].map(async ([key, date]) => {
        const summary = await getSummary(key as Range, date as Date);
        if (summary.ok) return [key as Range, summary] as const;
      });

      const data = await Promise.all(summaries);
      return { result: data.filter(Boolean) as NonNullable<(typeof data)[number]>[], ok: true };
    }, []),
    toasts: {
      error: (err) => ({
        title: "Failed fetching summary",
        message: err.message,
      }),
    },
  });

  return result;
}

type Range = "Today" | "Yesterday" | "Last 7 Days" | "Last 30 Days";
