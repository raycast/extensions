export interface RssFeedItem {
  /** Service name when the title uses the "[Service] Incident title" convention. */
  service?: string;
  title: string;
  guid?: string;
  pubDate?: string;
  status?: string;
  resolvedAt?: string;
  latestUpdate?: string;
  latestUpdateAt?: string;
}

export interface RssFeed {
  title: string;
  link?: string;
  items: RssFeedItem[];
}
