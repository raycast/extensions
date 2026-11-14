import { PitchDetector } from "pitchy";

export const SAMPLE_RATE = 44100;
export const FRAME_SIZE = 4096;
export const HOP_SIZE = 2048;
const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export interface Reading {
  db: number;
  peak: number;
  pitch: number | null;
  clarity: number;
}

export function frequencyToNote(pitch: number) {
  const midi = 69 + 12 * Math.log2(pitch / 440);
  const nearest = Math.round(midi);
  return {
    name: NAMES[((nearest % 12) + 12) % 12],
    octave: Math.floor(nearest / 12) - 1,
    cents: Math.round((midi - nearest) * 100),
    midi: nearest,
  };
}

export class Analyzer {
  private detector = PitchDetector.forFloat32Array(FRAME_SIZE);
  analyze(samples: Float32Array): Reading {
    if (samples.length !== FRAME_SIZE) throw new Error("Invalid analysis frame size");
    // Remove residual DC without changing the original signal.
    let mean = 0;
    let peak = 0;
    for (const value of samples) {
      mean += value;
      peak = Math.max(peak, Math.abs(value));
    }
    mean /= samples.length;
    const centered = new Float32Array(samples.length);
    let energy = 0;
    for (let i = 0; i < samples.length; i++) {
      centered[i] = samples[i] - mean;
      energy += centered[i] * centered[i];
    }
    const db = Math.max(-100, 20 * Math.log10(Math.sqrt(energy / samples.length) || 1e-5));
    if (db < -65) return { db, peak, pitch: null, clarity: 0 };
    const [pitch, clarity] = this.detector.findPitch(centered, SAMPLE_RATE);
    // Reject sub-audio artifacts, rather than displaying a convincing but impossible note.
    const valid = Number.isFinite(pitch) && pitch >= 35 && pitch <= 1800 && clarity >= 0.8;
    return { db, peak, pitch: valid ? pitch : null, clarity };
  }
}

/** Handles arbitrary pipe boundaries, including a split 16-bit sample. */
export class PCMFrames {
  private pending = Buffer.alloc(0);
  push(data: Buffer, onFrame: (frame: Float32Array) => void) {
    this.pending = Buffer.concat([this.pending, data]);
    while (this.pending.length >= FRAME_SIZE * 2) {
      const frame = new Float32Array(FRAME_SIZE);
      for (let i = 0; i < FRAME_SIZE; i++) frame[i] = this.pending.readInt16LE(i * 2) / 32768;
      onFrame(frame);
      this.pending = this.pending.subarray(HOP_SIZE * 2);
    }
    // Do not retain an entire large incoming buffer just for its small tail.
    this.pending = Buffer.from(this.pending);
  }
}
