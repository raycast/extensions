export interface UploadResponse {
  status: "success" | "error";
  id?: string;
  size?: number;
  duration?: number;
  expires?: number;
  error?: string;
}

export interface SplitParams {
  id: string;
  splitter?: "phoenix" | "orion" | "perseus";
  stem?:
    | "vocals"
    | "voice"
    | "drum"
    | "piano"
    | "bass"
    | "electric_guitar"
    | "acoustic_guitar"
    | "synthesizer"
    | "strings"
    | "wind";
  dereverb_enabled?: boolean;
  enhanced_processing_enabled?: boolean;
  noise_cancelling_level?: 0 | 1 | 2;
}

export interface SplitResponse {
  status: "success" | "error";
  task_id?: string;
  error?: string;
}

export interface TaskStatus {
  status: "success" | "error";
  name?: string;
  size?: number;
  duration?: number;
  splitter?: "phoenix" | "orion" | "perseus";
  stem?: string;
  split?: {
    duration: number;
    stem: string;
    stem_track: string;
    stem_track_size: number;
    back_track: string;
    back_track_size: number;
  };
  task?: {
    state: "success" | "error" | "progress" | "cancelled";
    error?: string;
    progress?: number;
  };
  error?: string;
}

export interface CheckResponse {
  status: "success" | "error";
  result?: Record<string, TaskStatus>;
  error?: string;
}

export interface VoiceChangeParams {
  id: string;
  voice: string;
  accent_enhance?: number;
  pitch_shifting?: boolean;
  dereverb_enabled?: boolean;
}

export interface VoiceChangeResponse {
  status: "success" | "error";
  id?: string;
  task_id?: string;
  error?: string;
}

export interface VoicePack {
  pack_id: string;
  name: string;
  created: string;
  ready_to_use: boolean;
  avatar_url?: string;
  expiration_date?: string;
  expires_after_days?: number;
  language: {
    code: string;
    full: string;
  };
  previews: Array<{
    label: string;
    playlist: string;
    waveform: string;
    sample: {
      playlist: string;
      waveform: string;
    };
  }>;
}

export interface VoicePacksResponse {
  status: "success" | "error";
  packs?: VoicePack[];
  error?: string;
}

export interface BillingLimits {
  status: "success" | "error";
  option?: string;
  email?: string;
  process_duration_limit?: number;
  process_duration_used?: number;
  process_duration_left?: number;
  error?: string;
}
