import { Detail } from "@raycast/api";

import { useClockArtwork } from "./hooks/use-clock-artwork";
import { useNow } from "./hooks/use-now";
import { renderClockMarkdown } from "./lib/clock-markdown";
import { getTimeFormatPreference } from "./lib/preferences";
import { formatClockDate, formatClockTime } from "./lib/time";

export default function Command() {
  const timeFormat = getTimeFormatPreference();
  const now = useNow();
  const time = formatClockTime(now, timeFormat);
  const date = formatClockDate(now);
  const clockImageUrl = useClockArtwork(time, date);

  return <Detail markdown={renderClockMarkdown(clockImageUrl)} />;
}
