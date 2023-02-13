import { useCallback } from "react";

import { useBase } from "./base";
import { getSummary } from "../utils";

export function useTodaySummary() {
  const result = useBase({
    handler: useCallback(async () => {
      const data = await getSummary("Today", new Date());
      if (!data.ok) throw new Error(data.error);

      return data;
    }, []),
    toasts: {
      error: (err) => ({
        title: "Error Loading Today's Summary",
        message: err.message,
      }),
    },
  });

  return result;
}
