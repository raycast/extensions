import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SAMPLE_RATE = 44_100;
const AUDIO_DIRECTORY = join(tmpdir(), "raycast-piano");

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function writeAscii(buffer: Buffer, offset: number, value: string): void {
  buffer.write(value, offset, value.length, "ascii");
}

function buildPianoWave(midi: number, sustained: boolean): Buffer {
  const duration = sustained ? 4.8 : 2.6;
  const sampleCount = Math.floor(SAMPLE_RATE * duration);
  const dataSize = sampleCount * 2;
  const output = Buffer.alloc(44 + dataSize);
  const frequency = midiToFrequency(midi);

  writeAscii(output, 0, "RIFF");
  output.writeUInt32LE(36 + dataSize, 4);
  writeAscii(output, 8, "WAVE");
  writeAscii(output, 12, "fmt ");
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(SAMPLE_RATE, 24);
  output.writeUInt32LE(SAMPLE_RATE * 2, 28);
  output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34);
  writeAscii(output, 36, "data");
  output.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index++) {
    const time = index / SAMPLE_RATE;
    const attack = Math.min(1, time / 0.008);
    const decay = Math.exp(-time * (sustained ? 0.72 : 1.65));
    const releaseStart = duration - 0.22;
    const release = time > releaseStart ? Math.max(0, (duration - time) / (duration - releaseStart)) : 1;

    // A compact additive model: a warm fundamental, struck upper partials, and
    // a tiny inharmonic component that gives the attack a piano-like shimmer.
    const tone =
      Math.sin(2 * Math.PI * frequency * time) * 0.7 +
      Math.sin(2 * Math.PI * frequency * 2 * time) * 0.2 * Math.exp(-time * 1.2) +
      Math.sin(2 * Math.PI * frequency * 3 * time) * 0.08 * Math.exp(-time * 2.1) +
      Math.sin(2 * Math.PI * frequency * 4.03 * time) * 0.035 * Math.exp(-time * 5.5);
    const hammer = Math.sin(2 * Math.PI * 2_400 * time) * Math.exp(-time * 65) * 0.025;
    const sample = Math.max(-1, Math.min(1, (tone + hammer) * attack * decay * release * 0.72));
    output.writeInt16LE(Math.round(sample * 32_767), 44 + index * 2);
  }

  return output;
}

function audioPath(midi: number, sustained: boolean): string {
  return join(AUDIO_DIRECTORY, `${midi}-${sustained ? "sustain" : "short"}.wav`);
}

export function preparePiano(): void {
  mkdirSync(AUDIO_DIRECTORY, { recursive: true });
}

export function playNote(midi: number, sustained: boolean, volume: number): void {
  const path = audioPath(midi, sustained);

  if (!existsSync(path)) {
    mkdirSync(AUDIO_DIRECTORY, { recursive: true });
    writeFileSync(path, buildPianoWave(midi, sustained));
  }

  const player = spawn("/usr/bin/afplay", ["-v", String(volume), path], {
    detached: true,
    stdio: "ignore",
  });
  player.unref();
}
