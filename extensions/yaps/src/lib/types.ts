export type VaultSource = "manual" | "voice" | "quick_capture" | "meeting" | "daily" | string;

export interface VaultNote {
  id: string;
  path: string;
  title: string;
  markdown: string;
  tags: string[];
  aliases: string[];
  source: VaultSource;
  kind: string;
  pinned: boolean;
  created_at: number;
  updated_at: number;
}

export interface VaultListResult {
  count: number;
  notes: VaultNote[];
}

export interface VaultNoteResult {
  note: VaultNote | null;
}

export interface VaultNoteMutationResult {
  changed_fields: string[];
  note: VaultNote;
}

export interface VaultSearchHit {
  note_id: string;
  path: string;
  score: number;
  snippet: string;
  title: string;
}

export interface VaultSearchResult {
  count: number;
  hits: VaultSearchHit[];
}

export interface VaultStatus {
  index_initialized: boolean;
  note_count: number;
  root: string;
}

export interface ExtensionPreferences {
  cliPath?: string;
  captureFolder: string;
}
