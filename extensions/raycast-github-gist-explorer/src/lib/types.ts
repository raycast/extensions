export type GistFileRecord = {
  filename: string;
  language?: string | null;
  rawUrl: string;
  size: number;
  truncated: boolean;
  content?: string;
  type?: string;
};

export type GistRecord = {
  id: string;
  description: string;
  htmlUrl: string;
  public: boolean;
  createdAt: string;
  updatedAt: string;
  files: GistFileRecord[];
};

export type SearchDocument = {
  id: string;
  gistId: string;
  description: string;
  filenamesText: string;
  contentText: string;
  public: boolean;
  updatedAt: string;
  fileCount: number;
  filenames: string[];
};

export type SyncMetadata = {
  lastSyncedAt: string;
  gistCount: number;
  indexVersion: number;
};

export type CachePayload = {
  gists: GistRecord[];
  documents: SearchDocument[];
  metadata: SyncMetadata;
};

export type SyncResult = {
  gistCount: number;
  fileCount: number;
  truncatedFilesFetched: number;
  failedFileFetches: number;
  durationMs: number;
  metadata: SyncMetadata;
};

export type CreateGistInput = {
  description: string;
  filename: string;
  content: string;
  isPublic: boolean;
};

export type GitHubGistFileResponse = {
  filename?: string;
  language?: string | null;
  raw_url?: string;
  size?: number;
  truncated?: boolean;
  content?: string;
  type?: string;
};

export type GitHubGistResponse = {
  id: string;
  description: string | null;
  html_url: string;
  public: boolean;
  created_at: string;
  updated_at: string;
  files: Record<string, GitHubGistFileResponse>;
};
