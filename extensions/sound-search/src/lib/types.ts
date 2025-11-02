export type SoundSearchConfig = {
  token: string;
  apiBaseUrl: string;
  createdAt: string;
};

export type StoredState = {
  soundrawConfig?: SoundSearchConfig;
};

export type Sample = {
  id: string;
  name: string;
  sample: string; // audio file URL
  genres: Record<string, string>; // object with genre keys and display names
  bpm?: number;
};

export type SearchSamplesRequest = {
  genres?: string[];
};

export type SearchSamplesResponse = {
  samples: Sample[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};
