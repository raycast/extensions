export type MiniMaxRegion = "cn" | "global";

export interface MiniMaxTTSRequest {
  model: string;
  text: string;
  stream: false;
  output_format: "hex";
  language_boost: string;
  voice_setting: {
    voice_id: string;
    speed: number;
    vol: number;
    pitch: number;
  };
  audio_setting: {
    sample_rate: number;
    bitrate: number;
    format: "mp3";
    channel: number;
  };
}

export interface MiniMaxTTSResponse {
  data?: {
    audio?: string;
    status?: number;
  } | null;
  extra_info?: {
    audio_format?: string;
    usage_characters?: number;
  };
  trace_id?: string;
  base_resp?: {
    status_code: number;
    status_msg: string;
  };
}

export interface MiniMaxFileUploadResponse {
  file?: {
    file_id?: number;
    bytes?: number;
    created_at?: number;
    filename?: string;
    purpose?: string;
  };
  base_resp?: {
    status_code: number;
    status_msg: string;
  };
}

export interface VoiceListResponse {
  system_voice?: MiniMaxVoicePayload[];
  voice_cloning?: MiniMaxVoicePayload[];
  voice_generation?: MiniMaxVoicePayload[];
  base_resp?: {
    status_code: number;
    status_msg: string;
  };
}

export interface MiniMaxVoicePayload {
  voice_id: string;
  voice_name?: string;
  description?: string[];
  created_time?: string;
}

export interface TTSOptions {
  voiceId: string;
  model: string;
  speed: number;
  languageBoost: string;
  region: MiniMaxRegion;
  format: "mp3";
  sampleRate: number;
  bitrate: number;
}

export interface MiniMaxVoiceCloneRequest {
  file_id: number;
  voice_id: string;
  text: string;
  model: string;
  language_boost?: string;
  clone_prompt?: {
    prompt_audio: number;
    prompt_text: string;
  };
  need_noise_reduction?: boolean;
  need_volume_normalization?: boolean;
  aigc_watermark?: boolean;
}

export interface MiniMaxVoiceCloneResponse {
  input_sensitive?: boolean;
  input_sensitive_type?: number;
  demo_audio?: string;
  base_resp?: {
    status_code: number;
    status_msg: string;
  };
}

export interface VoiceConfig {
  id: string;
  name: string;
  category: string;
  description?: string;
  gender?: "female" | "male" | "unknown";
  isCustom?: boolean;
}
