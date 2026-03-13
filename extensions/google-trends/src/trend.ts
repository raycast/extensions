export type TrendItem = {
  id: number;
  idx: string;
  name: string;
  timeAgo?: string;
  formattedTraffic?: string;
  article: string;
  articleUrl: string;
  trendUrl: string;
  imageUrl: string;
  keyword?: string[];
};

export type Trend = {
  date: string;
  items: TrendItem[];
};
