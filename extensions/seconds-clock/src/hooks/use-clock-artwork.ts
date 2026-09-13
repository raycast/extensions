import { useMemo } from "react";

import { renderClockSvg } from "../lib/clock-art";
import type { FormattedClockTime } from "../lib/time";

export function useClockArtwork(
  time: FormattedClockTime,
  date: string,
): string {
  return useMemo(() => {
    const svg = renderClockSvg({ time, date });

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [date, time.hours, time.minutes, time.seconds, time.meridiem]);
}
