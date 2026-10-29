export interface TranscriptHistoryVariant {
  mode: string;
  transcriptionElapsedSeconds?: number;
  characterCount?: number;
  pasteResult?: string;
  transcriptRelativePath?: string | null;
}

export interface TranscriptHistoryEntry {
  id: string;
  timestamp: number | string;
  modelID: string;
  audioDurationSeconds?: number;
  audioRelativePath?: string | null;
  variants?: TranscriptHistoryVariant[];
  transcriptionMode?: string;
  transcriptRelativePath?: string;
  transcript?: string;
  characterCount?: number;
}

export interface TranscriptHistoryDay {
  day: string;
  entries: TranscriptHistoryEntry[];
}

export interface HistoryRecord {
  day: string;
  entry: TranscriptHistoryEntry;
  preferredVariant: TranscriptHistoryVariant | null;
  transcript: string;
  transcriptPath: string | null;
  audioPath: string | null;
  date: Date;
}

export interface PetalModel {
  id: string;
  name: string;
  summary: string;
  provider: string;
  icon: string;
  size?: string;
  recommended?: boolean;
  isDownloaded?: boolean;
  supportsLiveTranscription?: boolean;
}

export interface PetalModelCatalogEntry {
  id: string;
  name: string;
  summary: string;
  provider: string;
  size?: string | null;
  isRecommended?: boolean;
  isDownloaded?: boolean;
  supportsLiveTranscription?: boolean;
}
