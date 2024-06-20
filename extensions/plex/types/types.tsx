export interface SectionsApiResponse {
  MediaContainer: {
    size: number;
    allowSync: string;
    title1: string;
    Directory: {
      allowSync: boolean;
      art: string;
      composite: string;
      filters: boolean;
      refreshing: boolean;
      thumb: string;
      key: string;
      type: string;
      title: string;
      agent: string;
      scannedAt: number;
      content: boolean;
      directory: boolean;
      hidden: number;
      language: string;
      Location: {
        id: number;
        path: string;
      }[];
    }[];
  };
}

type Metadata = {
  ratingKey: string;
  key: string;
  guid: string;
  slug: string;
  studio: string;
  type: string;
  title: string;
  contentRating: string;
  summary: string;
  rating: number;
  audienceRating: number;
  year: number;
  tagline: string;
  thumb: string;
  art: string;
  duration: number;
  originallyAvailableAt: string;
  addedAt: number;
  updatedAt: number;
  audienceRatingImage: string;
  chapterSource: string;
  hasPremiumExtras: string;
  hasPremiumPrimaryExtra: string;
  ratingImage: string;
};

type MediaContainer = {
  size: number;
  title1: string;
  title2: string;
  Metadata: Metadata;
};

export type SectionItemsApiResponse = {
  MediaContainer: MediaContainer;
};
