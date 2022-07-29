export interface Daily {
  default: Default;
}

export interface Default {
  trendingSearchesDays: TrendingSearchesDay[];
  endDateForNextRequest: string;
  rssFeedPageUrl: string;
}

export interface TrendingSearchesDay {
  date: string;
  formattedDate: string;
  trendingSearches: TrendingSearch[];
}

export interface TrendingSearch {
  title: Title;
  formattedTraffic: string;
  relatedQueries: Title[];
  image: Image;
  articles: Article[];
  shareUrl: string;
}

export interface Article {
  title: string;
  timeAgo: string;
  source: string;
  image?: Image;
  url: string;
  snippet: string;
}

export interface Image {
  newsUrl: string;
  source: string;
  imageUrl: string;
}

export interface Title {
  query: string;
  exploreLink: string;
}
