export interface TranscriptionMetadata {
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

export interface HistoryEntry extends TranscriptionMetadata {
  id: string;
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
  state?: string;
  active_workflow?: string | null;
  active_workflow_id?: string | null;
}

export interface DictationStartResponse {
  id: string;
  status: "recording";
  workflow_id?: string | null;
  workflow_name?: string | null;
}

export interface DictationStopResponse {
  id: string;
  status: "stopped";
}

export type DictationTranscriptionPayload = TranscriptionMetadata;

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

export interface WorkflowEntry extends ProfileEntry {
  language_mode?: string;
  language_hints?: string[];
}

export interface WorkflowsResponse {
  rules: WorkflowEntry[];
}

export interface WorkflowToggleResponse {
  id: string;
  name: string;
  is_enabled: boolean;
}

export interface ModelEntry {
  id: string;
  engine: string;
  name: string;
  size_description: string;
  language_count: number;
  status: string;
  selected: boolean;
  downloaded?: boolean | null;
  loaded?: boolean | null;
}

export interface ModelsResponse {
  models: ModelEntry[];
}

export interface DictionaryTermsResponse {
  terms: string[];
  count: number;
}

export interface DictionaryCorrection {
  original: string;
  replacement: string;
  caseSensitive: boolean;
}

export interface DictionaryCorrectionsResponse {
  corrections: DictionaryCorrection[];
  count: number;
}

export interface RecorderStatusResponse {
  recording: boolean;
}

export interface RecorderStartResponse {
  id: string;
  status: "recording";
}

export interface RecorderStopResponse {
  id: string;
  status: "finalizing";
}

export interface RecorderSessionResponse {
  id: string;
  status: "recording" | "finalizing" | "completed" | "failed";
  text?: string | null;
  output_file?: string | null;
  error?: string | null;
}
