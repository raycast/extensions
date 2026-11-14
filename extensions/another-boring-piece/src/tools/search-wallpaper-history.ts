import { searchWallpaperHistory } from "../history-store";
import type { Wallpaper } from "../utils";

type Input = {
  /** Case-insensitive words matched across artwork title, artist, description, ID, and creation year. All words must match. */
  query?: string;
  /** First history date to include, YYYY-MM-DD in the user's local timezone. Filters usage dates, not the artwork's creation year. */
  fromDate?: string;
  /** Last history date to include, YYYY-MM-DD in the user's local timezone. The entire day is included. */
  toDate?: string;
  /** Optional action filter. "selected" means MANUAL selections only, excluding automatic switches. For "when I set/used this wallpaper" or "every time it was set", OMIT this filter to include both manual and automatic settings. Use "downloaded" for downloads or "auto-switched" for automatic switches only. */
  eventType?: "selected" | "downloaded" | "auto-switched";
};

type HistoryItem = {
  wallpaper: Wallpaper;
  events: { eventType: string; timestamp: string }[];
};

/** Returns unique artworks with only matching events, ordered by latest matching action. Omit filters to return all history. */
export default async function tool(input: Input): Promise<HistoryItem[]> {
  return (await searchWallpaperHistory(input)).map((entry) => ({
    wallpaper: entry.wallpaper,
    events: entry.events.map((event) => ({
      eventType: event.eventType,
      timestamp: event.timestamp,
    })),
  }));
}
