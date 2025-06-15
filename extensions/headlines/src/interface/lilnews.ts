export interface LilNews {
  articles: LilArticle[];
}

export interface LilArticle {
  author: null | string;
  url: string;
  source: string;
  title: string;
  description: string;
  image: string;
  date: Date;
}
