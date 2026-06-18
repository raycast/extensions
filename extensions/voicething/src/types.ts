export type MemeClip = {
  id: string;
  name: string;
  soundURL: string;
  thumbnailURL?: string;
  category?: string;
  tags: string[];
  cachedAudioPath?: string;
  isFavorite?: boolean;
  username?: string;
  license?: string;
  sourceURL?: string;
  duration?: number;
};

export type StoredClip = MemeClip;
