import { Collection, Photo, Video } from "pexels";

export type CollectionsResponse = { page: number; per_page: number; collections: Collection[] };

export type CollectionMediasResponse = {
  page: number;
  per_page: number;
  total_results: number;
  media: ((Photo & { type: "Video" | "Photo" }) | (Video & { type: "Video" | "Photo" }))[];
};

export type PexelsPhoto = Photo & { avg_color: string; alt: string };

export type SearchRequest = {
  searchContent: string;
  page: number;
};
