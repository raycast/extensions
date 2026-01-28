export interface Realtime {
  featuredStoryIds: unknown[];
  trendingStoryIds: string[];
  storySummaries: StorySummaries;
  date: string;
  hideAllImages: boolean;
}

export interface StorySummaries {
  featuredStories: unknown[];
  trendingStories: TrendingStory[];
}

export interface TrendingStory {
  image: Image;
  shareUrl: string;
  articles: Article[];
  idsForDedup: string[];
  id: string;
  title: string;
  entityNames: string[];
}

export interface Article {
  articleTitle: string;
  url: string;
  source: string;
  time: string;
  snippet: string;
}

export interface Image {
  newsUrl: string;
  source: string;
  imgUrl: string;
}
