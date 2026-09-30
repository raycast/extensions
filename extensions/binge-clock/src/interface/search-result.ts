import { ShowWatchTime } from "./show-watch-time";

export type SearchResultType = "show" | "film";

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  image: string | null;
  type: SearchResultType;
  watchTime: ShowWatchTime;
  year: number | null;
  fromYear: number | null;
  toYear: number | null;
  episodeCount: number | null;
  runtimeMinutes: number | null;
}
