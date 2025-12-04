import { Torrent } from "@/types";
import { formatDistanceToNow, addSeconds, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
import { useMemo } from "react";

export default function useRemaining(torrent: Torrent) {
  return useMemo(() => {
    if (torrent.percentDone >= 1) {
      return "Completed";
    }
    if (torrent.eta && torrent.percentDone > 0 && torrent.percentDone < 1) {
      const start = new Date(); // Start date
      const end = addSeconds(new Date(), torrent.eta); // End date

      // Calculate the difference in hours and minutes
      const hours = differenceInHours(end, start);
      const minutes = differenceInMinutes(end, start) % 60;
      const seconds = differenceInSeconds(end, start) % 60;

      if (hours > 24) {
        return formatDistanceToNow(addSeconds(new Date(), torrent.eta), {
          includeSeconds: true,
        });
      }

      const result = [
        hours > 0 ? `${hours}h` : null,
        minutes > 0 || hours > 0 ? `${minutes}m` : null,
        seconds > 0 ? `${seconds}s` : null,
      ]
        .filter(Boolean)
        .join(" ");

      return result;
    }
    return "N/A";
  }, [torrent]);
}
