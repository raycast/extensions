import { readWallpaperHistory } from "../history-store";
import type { Wallpaper } from "../utils";

type HistoryItem = {
  wallpaper: Wallpaper;
  events: {
    eventType: string;
    timestamp: string;
  }[];
};

export default async function tool(): Promise<HistoryItem[]> {
  return (await readWallpaperHistory()).map((entry) => ({
    wallpaper: entry.wallpaper,
    events: entry.events.map((event) => ({
      eventType: event.eventType,
      timestamp: event.timestamp,
    })),
  }));
}
