import type { Image } from "@raycast/api";

export type ApiRecord = Record<string, unknown>;

export type ChallengeFilter = "challenges" | "highlights" | "consumed" | "prizes" | "guests" | "series" | "tshirts";

export type ChallengeEntry = {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  thumbnailUrl: string;
  record: ApiRecord;
};

export type RelationItem = {
  id?: string;
  title: string;
  slug?: string;
  section?: string;
  url?: string;
};

export type PagedResult = {
  records: ApiRecord[];
  nextUrl: string | null;
  nextPage: number | null;
  pageSize: number;
};

export type ResourceConfig = Record<ChallengeFilter, { title: string; path: string; icon?: Image.ImageLike }>;
