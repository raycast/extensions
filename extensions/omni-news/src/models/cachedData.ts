import { Article } from "./article";

export interface CachedData {
  articles: Article[];
  timestamp: number;
}
