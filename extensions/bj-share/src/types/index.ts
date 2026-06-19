export interface TorrentItem {
  title?: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
  seeders?: string;
  leechers?: string;
}

export interface Feed {
  id: string;
  name: string;
  url: string;
}
