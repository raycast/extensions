export type Collection = {
  name: string;
  description?: string;
  files: string[]; // raw paths saved within collection, such as directories
  indexedFiles: string[]; // list of files indexed in SearchKit
};

export type Document = {
  id: number;
  file: string;
  score: number;
  page: number;
  lower: number | undefined;
  upper: number | undefined;
  // summary: string;
};

// Swift API response formats
export type UpsertCollectionResponse = {
  messages: string[];
  indexedFiles: string[];
};
