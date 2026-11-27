export const SITE = "https://www.galaxymovies.app";

export const PROVIDERS: { key: string; label: string }[] = [
  { key: "netflix", label: "Netflix" },
  { key: "amazon-prime-video", label: "Amazon Prime Video" },
  { key: "hulu", label: "Hulu" },
  { key: "disney-plus", label: "Disney+" },
  { key: "apple-tv", label: "Apple TV" },
  { key: "max", label: "HBO Max" },
  { key: "peacock", label: "Peacock" },
  { key: "paramount-plus", label: "Paramount+" },
  { key: "tubi", label: "Tubi" },
  { key: "pluto-tv", label: "Pluto TV" },
  { key: "roku-channel", label: "The Roku Channel" },
  { key: "starz", label: "Starz" },
  { key: "amc-plus", label: "AMC+" },
  { key: "mgm-plus", label: "MGM+" },
  { key: "crunchyroll", label: "Crunchyroll" },
  { key: "discovery-plus", label: "Discovery+" },
  { key: "plex", label: "Plex" },
  { key: "kanopy", label: "Kanopy" },
  { key: "shudder", label: "Shudder" },
  { key: "criterion", label: "Criterion Channel" },
];

export interface CatalogTitle {
  tmdbId: number;
  tmdbType: "movie" | "tv";
  title: string;
  year?: number;
  date?: string;
  season?: number | null;
  popularity?: number;
}

export interface ProviderChanges {
  label: string;
  provider: string;
  updatedAt: number;
  coming: CatalogTitle[];
  added: CatalogTitle[];
  left: CatalogTitle[];
}

interface WatchProvider {
  id: number;
  name: string;
}

export interface WhereResult {
  tmdbId: number;
  tmdbType: "movie" | "tv";
  title: string;
  year?: number;
  region: string;
  providers: {
    flatrate: WatchProvider[];
    free: WatchProvider[];
    ads: WatchProvider[];
    rent: WatchProvider[];
    buy: WatchProvider[];
  };
  url: string;
}

export function titleUrl(t: CatalogTitle): string {
  return `${SITE}/${t.tmdbType === "tv" ? "tv" : "movies"}/${t.tmdbId}`;
}
