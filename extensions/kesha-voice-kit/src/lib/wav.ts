import { readFile } from "node:fs/promises";
import { SILENCE_PEAK_THRESHOLD } from "./dictation-config";

const WAVE_FORMAT_PCM = 1;
const WAVE_FORMAT_IEEE_FLOAT = 3;
const WAVE_FORMAT_EXTENSIBLE = 0xfffe;

export async function isSilentWavFile(audioPath: string): Promise<boolean> {
  return isSilentWav(await readFile(audioPath));
}

export function isSilentWav(wav: Buffer): boolean {
  const fmt = findWavChunk(wav, "fmt ");
  const data = findWavChunk(wav, "data");
  if (!fmt || !data || fmt.length < 16 || data.length === 0) return false;

  const audioFormat = wav.readUInt16LE(fmt.offset);
  const formatTag = wavPayloadFormat(wav, fmt, audioFormat);
  const bitsPerSample = wav.readUInt16LE(fmt.offset + 14);

  if (formatTag === WAVE_FORMAT_IEEE_FLOAT && bitsPerSample === 32) {
    return isFloat32Silent(wav, data);
  }

  if (formatTag === WAVE_FORMAT_PCM && bitsPerSample === 16) {
    return isInt16Silent(wav, data);
  }

  return false;
}

export function findWavChunk(
  wav: Buffer,
  id: string,
): { offset: number; length: number } | null {
  for (let offset = 12; offset + 8 <= wav.length;) {
    const length = wav.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (wav.toString("ascii", offset, offset + 4) === id) {
      return { offset: dataOffset, length };
    }
    offset = dataOffset + length + (length % 2);
  }
  return null;
}

export function wavPayloadFormat(
  wav: Buffer,
  fmt: { offset: number; length: number },
  audioFormat: number,
): number {
  if (audioFormat !== WAVE_FORMAT_EXTENSIBLE || fmt.length < 40) {
    return audioFormat;
  }
  const subFormatOffset = fmt.offset + 24;
  if (subFormatOffset + 4 > wav.length) {
    return audioFormat;
  }
  return wav.readUInt32LE(subFormatOffset);
}

function isFloat32Silent(
  wav: Buffer,
  data: { offset: number; length: number },
): boolean {
  for (
    let offset = data.offset;
    offset + 4 <= data.offset + data.length && offset + 4 <= wav.length;
    offset += 4
  ) {
    if (Math.abs(wav.readFloatLE(offset)) > SILENCE_PEAK_THRESHOLD) {
      return false;
    }
  }
  return true;
}

function isInt16Silent(
  wav: Buffer,
  data: { offset: number; length: number },
): boolean {
  for (
    let offset = data.offset;
    offset + 2 <= data.offset + data.length && offset + 2 <= wav.length;
    offset += 2
  ) {
    if (Math.abs(wav.readInt16LE(offset)) / 32768 > SILENCE_PEAK_THRESHOLD) {
      return false;
    }
  }
  return true;
}
