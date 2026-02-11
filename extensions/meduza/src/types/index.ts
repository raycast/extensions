export type Language = "ru" | "en";

export interface FeedItem {
  readonly title: string;
  readonly link: string;
  readonly pubDate: string;
  readonly content: string;
  readonly icon: string;
  readonly enclosure?: {
    readonly url: string;
  };
}

export interface FeedConfig {
  readonly url: string;
}

export interface ArticleDetailProps {
  readonly article: FeedItem;
  readonly locale: string;
}
