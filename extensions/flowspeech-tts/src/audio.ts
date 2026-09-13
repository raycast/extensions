import { GeneratedAudio } from "./api";

function isWav(audio: Buffer, mimeType: string): boolean {
  return mimeType.toLowerCase().includes("wav") || audio.subarray(0, 4).toString("ascii") === "RIFF";
}

export function toWav(audioData: GeneratedAudio): Buffer {
  if (isWav(audioData.audio, audioData.mimeType)) {
    return audioData.audio;
  }

  const { audio, sampleRate, numChannels, bitsPerSample } = audioData;
  const header = Buffer.alloc(44);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + audio.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(audio.length, 40);

  return Buffer.concat([header, audio]);
}
