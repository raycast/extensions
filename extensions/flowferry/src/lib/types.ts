export interface ArticlePayload {
  title: string;
  content: string;
  url: string;
  description?: string;
  cover?: string;
}

export interface ExtractedArticle {
  title: string;
  content: string;
  url: string;
  excerpt: string;
  leadImageUrl: string;
  domain: string;
}
