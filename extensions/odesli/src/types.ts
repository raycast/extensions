export interface Entity {
  id: string;
  type: string;
  title?: string;
  artistName?: string;
  thumbnailUrl?: string;
  apiProvider: string;
  platforms: string[];
}

export interface SongInfo {
  entityUniqueId: string;
  pageUrl: string;
  entitiesByUniqueId?: Record<string, Entity>;
}

export interface HistoryItem {
  id: string;
  originalUrl: string;
  odesliUrl: string;
  title?: string;
  artist?: string;
  thumbnailUrl?: string;
  timestamp: number;
  isFavorite: boolean;
}

export interface ConversionResult {
  url: string;
  title?: string;
  artist?: string;
}
