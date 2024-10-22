import { TorrentCategories } from "./torrent-categories";

type CategoryPreferences = {
  [key in keyof typeof TorrentCategories]: boolean;
};

export interface JackettPreferences extends BasePreferences, CategoryPreferences {
  jackettParserUrl: string;
  jackettApiKey: string;
}

export interface BasePreferences {
  torrserverUrl: string;
  login: string;
  password: string;
  mediaPlayerApp: {
    name: string;
    bundleId: string;
    path: string;
  };
}
