export interface Feed<T> {
  items: T[];
  feedUrl: string;
  image: Image;
  title: string;
  description: string;
  webMaster: string;
  managingEditor: string;
  link: string;
  language: string;
}

export interface Image {
  link: string;
  url: string;
  title: string;
}

export interface FeedItemInterface {
  title: string;
  link: string;
  pubDate: string;
  "content:encoded": string;
  "dc:creator": string;
  mediaContent: string;
  description: string;
  guid: string;
}

export interface PaginationLinks {
  self: string;
}

export type FeedType = "betas" | "tools" | "interviews";

export type Tool = FeedItemInterface;
export type Beta = FeedItemInterface;
export type Interview = FeedItemInterface;
