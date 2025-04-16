import { useCallback } from "react";

import { useBase } from "./base";
import { getSummary } from "../utils";

export function useSummary() {
  const result = useBase({
    handler: useCallback(async () => {
      const summaries = (["Today", "Yesterday", "Last 7 Days", "Last 30 Days"] satisfies WakaTime.KNOWN_RANGE[]).map(
        async (key) => {
          const summary = await getSummary(key);
          if (summary.ok) return [key, summary] as const;
        },
      );

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
