export interface PromptCategory {
  name: string;
  iconName?: string;
  colorHex?: string;
}

export interface PromptRecord {
  id: string;
  title: string;
  content: string;
  isFavorite: boolean;
  usageCount: number;
  createdAt?: string;
  updatedAt?: string;
  lastUsedAt?: string;
  category?: PromptCategory;
  tags: string[];
}

export interface PromptSnapshotV1 {
  schemaVersion: 1;
  generatedAt: string;
  appVersion: string;
  prompts: PromptRecord[];
}

export interface ParsedSnapshot {
  snapshot: PromptSnapshotV1;
  skippedRecordCount: number;
}
