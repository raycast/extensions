import { exec, execSync } from "child_process";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { environment } from "@raycast/api";
import path from "path";

export type ToneType = "warm" | "pure" | "bright" | "soft";
export type Duration = 1 | 2 | 5 | 0; // 0 = infinite

const SAMPLE_RATE = 44100;
const MAX_AMPLITUDE = 0.4; // keep it comfortable

// Track running afplay processes so we can stop them
const runningProcesses: Map<string, ReturnType<typeof exec>> = new Map();

function ensureSupportDir() {
  const dir = environment.supportPath;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Generate a WAV buffer for one or more frequencies.
 * Supports different tone types with envelope shaping.
 */
function generateWav(
  frequencies: number[],
  durationSecs: number,
  toneType: ToneType,
  options?: { seamlessLoop?: boolean },
): Buffer {
  const numSamples = Math.floor(SAMPLE_RATE * durationSecs);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  // WAV header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  const seamlessLoop = options?.seamlessLoop ?? false;
  // Avoid per-cycle fade in/out for looped playback (causes audible pulsing).
  const attackSamples = seamlessLoop ? 0 : Math.min(Math.floor(SAMPLE_RATE * 0.05), numSamples); // 50ms attack
  const decaySamples = seamlessLoop ? 0 : Math.min(Math.floor(SAMPLE_RATE * 0.15), numSamples); // 150ms decay

  const amplitude = MAX_AMPLITUDE / Math.max(frequencies.length, 1);

  for (let i = 0; i < numSamples; i++) {
    let sample = 0;
    const t = i / SAMPLE_RATE;

    for (const freq of frequencies) {
      switch (toneType) {
        case "pure":
          sample += Math.sin(2 * Math.PI * freq * t);
          break;

        case "warm":
          // Fundamental + soft overtones, very pleasant
          sample += Math.sin(2 * Math.PI * freq * t) * 0.7;
          sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.15;
          sample += Math.sin(2 * Math.PI * freq * 3 * t) * 0.08;
          sample += Math.sin(2 * Math.PI * freq * 4 * t) * 0.04;
          break;

        case "bright":
          // More harmonics for a richer, brighter sound
          sample += Math.sin(2 * Math.PI * freq * t) * 0.5;
          sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.25;
          sample += Math.sin(2 * Math.PI * freq * 3 * t) * 0.12;
          sample += Math.sin(2 * Math.PI * freq * 4 * t) * 0.08;
          sample += Math.sin(2 * Math.PI * freq * 5 * t) * 0.05;
          break;

        case "soft":
          // Sine with gentle exponential decay built in
          sample += Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 1.5);
          sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.1 * Math.exp(-t * 2);
          break;
      }
    }

    // Apply envelope
    let envelope = 1;
    if (attackSamples > 0 && i < attackSamples) {
      envelope = i / attackSamples;
    } else if (decaySamples > 0 && i > numSamples - decaySamples) {
      envelope = (numSamples - i) / decaySamples;
    }

    sample *= amplitude * envelope;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

/** Generate a unique ID for a playback session */
function playbackId(frequencies: number[]): string {
  return frequencies.map((f) => f.toFixed(2)).join("-");
}

/**
 * Play one or more frequencies. Returns an ID for the playback session.
 * For infinite duration, generates a 30-second looping file.
 */
export function playFrequencies(frequencies: number[], duration: Duration = 2, toneType: ToneType = "warm"): string {
  const dir = ensureSupportDir();
  const id = playbackId(frequencies);
  const loop = duration === 0;
  const actualDuration = loop ? 30 : duration;
  const wavBuffer = generateWav(frequencies, actualDuration, toneType, {
    seamlessLoop: loop,
  });
  const filePath = path.join(dir, `tone-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.wav`);

  writeFileSync(filePath, new Uint8Array(wavBuffer.buffer, wavBuffer.byteOffset, wavBuffer.byteLength));

  // Stop any existing playback of this exact frequency set
  stopPlayback(id);

  const command = `afplay "${filePath}"`;

  const playOnce = () => {
    const proc = exec(command, (err) => {
      // Ignore stale callbacks from previous processes using the same playback id.
      if (runningProcesses.get(id) !== proc) {
        try {
          unlinkSync(filePath);
        } catch {
          /* already cleaned */
        }
        return;
      }

      if (!err && loop) {
        // Loop: play again
        playOnce();
      } else {
        // Cleanup
        runningProcesses.delete(id);
        try {
          unlinkSync(filePath);
        } catch {
          /* already cleaned */
        }
      }
    });
    runningProcesses.set(id, proc);
  };

  playOnce();
  return id;
}

/** Stop a specific playback by ID */
export function stopPlayback(id: string): void {
  const proc = runningProcesses.get(id);
  if (proc && proc.pid) {
    try {
      process.kill(proc.pid);
    } catch {
      /* already dead */
    }
    runningProcesses.delete(id);
  }
}

/** Stop all currently playing tones */
export function stopAll(): void {
  for (const [, proc] of runningProcesses) {
    if (proc.pid) {
      try {
        process.kill(proc.pid);
      } catch {
        /* already dead */
      }
    }
  }
  runningProcesses.clear();

  // Belt and suspenders: kill any leftover afplay from our temp files
  try {
    execSync("pkill -f 'afplay.*tone-' 2>/dev/null || true");
  } catch {
    /* nothing playing */
  }
}

/** Check if anything is currently playing */
export function isPlaying(): boolean {
  return runningProcesses.size > 0;
}

/** Get count of currently playing tones */
export function playingCount(): number {
  return runningProcesses.size;
}
