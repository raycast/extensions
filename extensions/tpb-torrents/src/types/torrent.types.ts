export interface BaseTorrent {
  id: string;
  name: string;
  info_hash: string;
  leechers: string;
  seeders: string;
  num_files: string;
  size: string;
  username: string;
  added: string;
  status: string;
  category: string;
  imdb: string;
}

export interface TorrentDetail extends BaseTorrent {
  descr: string | null;
  language: string | null;
  textlanguage: string | null;
}

export type SearchResponse = BaseTorrent[];
