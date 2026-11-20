import { GeneratedAudio } from "./api";
import { validateWav } from "./client";

export function toWav(audioData: GeneratedAudio): Buffer {
  if (
    audioData.mimeType !== "audio/wav" ||
    audioData.sampleRate !== 24000 ||
    audioData.numChannels !== 1 ||
    audioData.bitsPerSample !== 16
  )
    throw new Error("Expected 24 kHz mono 16-bit WAV audio");
  validateWav(audioData.audio);
  return audioData.audio;
}
