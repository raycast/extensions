import dayjs from "dayjs";
import { useMemo } from "react";

import { TimeEntry } from "@/api";

export function useTotalDurationToday(timeEntries: TimeEntry[], runningTimeEntry?: TimeEntry) {
  return useMemo(() => {
    let seconds = timeEntries
      .slice(runningTimeEntry ? 1 : 0)
      .filter((timeEntry) => dayjs(timeEntry.start).isSame(dayjs(), "day"))
      .reduce((acc, timeEntry) => acc + timeEntry.duration, 0);
    if (runningTimeEntry) seconds += dayjs().diff(dayjs(runningTimeEntry.start), "second");
    return seconds;
  }, [timeEntries, runningTimeEntry]);
}
