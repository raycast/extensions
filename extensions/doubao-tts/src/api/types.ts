/** V3 API request body sent to /api/v3/tts/unidirectional */
export interface TTSV3Request {
  user: {
    uid: string;
  };
  req_params: {
    text: string;
    speaker: string;
    audio_params: {
      format: string;
      sample_rate: number;
      speech_rate: number;
    };
  };
}

/** A single JSON line from the V3 streaming response */
export interface TTSV3ResponseChunk {
  reqid: string;
  code: number;
  message: string;
  sequence: number;
  data: string;
  addition?: {
    duration?: string;
    frontend?: string;
  };
}

export interface TTSOptions {
  speaker: string;
  speechRate: number;
  format: string;
  sampleRate: number;
}

export interface VoiceConfig {
  id: string;
  name: string;
  gender: "female" | "male" | "child";
  category: string;
  free: boolean;
  model: "seed-tts-1.0" | "seed-tts-2.0";
}
