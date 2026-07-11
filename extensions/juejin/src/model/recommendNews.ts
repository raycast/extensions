export interface RecommendNews {
  articleId: string;
  title: string;
  subTitle: string;
  readTime: string;
  viewCount: number;
  collectCount: number;
  diggCount: number;
  commentCount: number;
  userName: string;
  categoryName: string;
}

export type RecommendCache = {
  list: RecommendNews[];
  timestamp: number;
};
