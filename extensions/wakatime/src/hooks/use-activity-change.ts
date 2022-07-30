import { subDays } from "date-fns";

import { useBase } from "./base";
import { getSummary, getDuration } from "../utils";

export function useActivityChange() {
  const result = useBase({
    async handler() {
      const data = await getSummary("Last 1 Day", subDays(new Date(), 1));
      if (!data.ok) throw new Error(data.error);
      const days = Object.fromEntries(
        data.data.map((day) => [day.range.text.toLowerCase(), day.grand_total.total_seconds])
      );

      const timeDiff = Math.abs(days.today - days.yesterday);
      const [quantifier, emoji] = days.today <= days.yesterday ? ["less", "⬇️"] : ["more", "⬆️"];

      return {
        emoji,
        ok: true,
        percent: Math.floor((timeDiff / days.yesterday) * 1e2),
        duration: `You've spent ${getDuration(timeDiff)} ${quantifier} compared to yesterday`,
      };
    },
  });

  return result;
}
