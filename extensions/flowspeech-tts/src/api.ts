const FLOWSPEECH_TTS_ENDPOINT = "https://flowspeech.io/api/ai/text-to-speech";

export interface GeneratedAudio {
  audio: Buffer;
  mimeType: string;
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
}

interface FlowSpeechResponse {
  code?: number;
  message?: string;
  data?: {
    audioBase64?: string;
    mimeType?: string;
    sampleRate?: number;
    numChannels?: number;
    bitsPerSample?: number;
  };
}

export async function generateSpeech(text: string, voiceName: string, apiKey: string): Promise<GeneratedAudio> {
  const response = await fetch(FLOWSPEECH_TTS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      originalText: text,
      speakers: [{ voiceName }],
      clientSource: "raycast-extension",
      clientVersion: "1.0.0",
    }),
  });

  let result: FlowSpeechResponse;
  try {
    result = (await response.json()) as FlowSpeechResponse;
  } catch {
    throw new Error(`FlowSpeech returned an invalid response (${response.status})`);
  }

  if (!response.ok || result.code !== 0) {
    throw new Error(result.message || `FlowSpeech request failed (${response.status})`);
  }

  if (!result.data?.audioBase64) {
    throw new Error("FlowSpeech returned no audio data");
  }

  return {
    audio: Buffer.from(result.data.audioBase64, "base64"),
    mimeType: result.data.mimeType || "audio/L16;rate=24000",
    sampleRate: result.data.sampleRate || 24000,
    numChannels: result.data.numChannels || 1,
    bitsPerSample: result.data.bitsPerSample || 16,
  };
}
