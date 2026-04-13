export interface HistoryEntry {
  id: string;
  text: string;
  raw_text: string;
  timestamp: string;
  app_name: string | null;
  app_bundle_id: string | null;
  app_url: string | null;
  duration: number;
  language: string | null;
  engine: string;
  model: string | null;
  words_count: number;
}

export interface HistoryResponse {
  entries: HistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProfileEntry {
  id: string;
  name: string;
  is_enabled: boolean;
  priority: number;
  bundle_identifiers: string[];
  url_patterns: string[];
  input_language: string | null;
  translation_target_language: string | null;
}

export interface ProfilesResponse {
  profiles: ProfileEntry[];
}

export interface StatusResponse {
  status: string;
  engine: string;
  model: string | null;
  supports_streaming: boolean;
  supports_translation: boolean;
}

export interface DictationStatusResponse {
  is_recording: boolean;
}

export interface DictationStartResponse {
  id: string;
  status: "recording";
}

export interface DictationStopResponse {
  id: string;
  status: "stopped";
}

export interface DictationTranscriptionPayload {
  text: string;
  raw_text: string;
  timestamp: string;
  app_name: string | null;
  app_bundle_id: string | null;
  app_url: string | null;
  duration: number;
  language: string | null;
  engine: string;
  model: string | null;
  words_count: number;
}

export interface DictationTranscriptionResponse {
  id: string;
  status: "recording" | "processing" | "completed" | "failed";
  transcription?: DictationTranscriptionPayload | null;
  error?: string | null;
}

export interface TranscribeResponse {
  text: string;
  language: string | null;
  duration: number;
  processing_time: number;
  engine: string;
  model: string | null;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
