import { FlowSpeechClient } from "./client";

export interface GeneratedAudio {
  requestId: string;
  jobId: string;
  audio: Buffer;
  mimeType: string;
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
}

export async function generateSpeech(
  text: string,
  voiceName: string,
  apiKey: string,
  requestId: string,
  signal?: AbortSignal,
): Promise<GeneratedAudio> {
  const client = new FlowSpeechClient({ apiKey });
  const result = await client.generate({ mode: "single", text, voiceName }, requestId, signal);
  return {
    audio: Buffer.from(result.audio),
    mimeType: "audio/wav",
    sampleRate: 24000,
    numChannels: 1,
    bitsPerSample: 16,
    requestId: result.requestId,
    jobId: result.job.id,
  };
}
