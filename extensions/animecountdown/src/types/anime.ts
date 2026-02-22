/**
 * Categories of anime sections available for browsing.
 */
export enum AnimeViewType {
  TRENDING = "trending",
  UPCOMING = "upcoming",
}

/**
 * Plain object representation of an AnimeItem for persistent storage.
 * Used for serializing/deserializing items from the Raycast cache.
 */
export interface AnimeItemJSON {
  id: string;
  slug: string;
  title: string;
  episode: string;
  countdownSeconds: number;
  fetchedAt: number;
  posterUrl: string;
  hotPercentage: number;
  url: string;
}
