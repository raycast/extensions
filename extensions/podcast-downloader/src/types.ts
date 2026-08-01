export type Podcast = {
  id: number | string;
  title: string;
  author?: string;
  description?: string;
  image?: string;
  url: string;
  episodeCount?: number;
};

export type Episode = {
  id: number | string;
  title: string;
  description?: string;
  datePublished?: number;
  duration?: number;
  enclosureUrl: string;
  enclosureType?: string;
  feedTitle?: string;
};
