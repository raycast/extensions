import { tmpdir } from "os";
import { join } from "path";
import { readFileSync, unlinkSync } from "fs";
import { execSync } from "child_process";
import { soxUtils } from "./sox.utils";

import { PitchDetector } from "pitchy";
import { A4_FREQ, CENTS_THRESHOLD, NOTE_NAMES, SAMPLE_RATE } from "../constants";

/**
 * Converts a frequency (Hz) to musical note information using equal temperament tuning
 *
 * Uses the formula: MIDI note = 12 * log2(frequency / 440) + 69
 * Where 69 is the MIDI note number for A4 (440Hz)
 *
 * @param frequency - The frequency in Hertz to convert
 * @returns Object containing note name, octave number, and cents deviation
 */
export function frequencyToNote(frequency: number): { note: string; octave: number; cents: number } {
  const A4 = 69;
  const midiNote = 12 * Math.log2(frequency / A4_FREQ) + A4;
  const noteNumber = Math.round(midiNote);
  const cents = Math.round((midiNote - noteNumber) * 2 * CENTS_THRESHOLD);
  const octave = Math.floor(noteNumber / 12) - 1;
  const note = NOTE_NAMES[noteNumber % 12];

  return { note, octave, cents };
}

/**
 * Records and analyzes a single audio chunk for pitch detection
 *
 * Process:
 * 1. Record 0.5 seconds of audio using Sox
 * 2. Convert WAV to raw PCM format
 * 3. Load audio data into Node.js buffer
 * 4. Convert to Float32Array for Pitchy
 * 5. Perform pitch detection using autocorrelation
 * 6. Clean up temporary files
 *
 * @returns Object with pitch (Hz) and clarity (0-1), or null if error
 */
export const analyzeSingleChunk = async (): Promise<{ pitch: number; clarity: number } | null> => {
  // Generate unique temporary file names to avoid conflicts
  const tempFile = join(tmpdir(), `tuner_${Date.now()}.wav`);
  const rawFile = join(tmpdir(), `tuner_raw_${Date.now()}.raw`);

  try {
    // Validate sox is available before proceeding
    const soxPath = soxUtils.getSoxPath();
    if (!soxPath) {
      throw new Error("Sox binary not found");
    }

    // Sox command breakdown:
    // -d: Use default audio input device (microphone)
    // -c 1: Record in mono (1 channel) - sufficient for pitch detection
    // -r SAMPLE_RATE: Sample rate
    // -b 16: 16-bit depth - good balance of quality and performance
    // trim 0 0.5: Record for 0.5 seconds starting at position 0
    execSync(`"${soxPath}" -d -c 1 -r ${SAMPLE_RATE} -b 16 "${tempFile}" trim 0 0.5`);

    // Sox conversion command breakdown:
    // Input: WAV file from recording
    // -r SAMPLE_RATE: Sample rate
    // -e signed-integer: Use signed integer encoding
    // -b 16: 16-bit samples
    // -c 1: Mono output
    // -t raw: Output as raw PCM data (no headers)
    execSync(`"${soxPath}" "${tempFile}" -r ${SAMPLE_RATE} -e signed-integer -b 16 -c 1 -t raw "${rawFile}"`);

    // Read the raw PCM file as binary data
    const audioBuffer = readFileSync(rawFile);

    // Pitchy expects normalized float values between -1.0 and 1.0
    const samples = new Float32Array(audioBuffer.length / 2); // Divide by 2 because 16-bit = 2 bytes per sample

    // Convert each 16-bit signed integer sample to normalized float
    let maxSample = 0;
    for (let i = 0; i < samples.length; i++) {
      // Read 16-bit signed integer from buffer (little-endian)
      const sample = audioBuffer.readInt16LE(i * 2);

      // Normalize to -1.0 to 1.0 range (32768 = 2^15, max value for signed 16-bit)
      samples[i] = sample / 32768;
      maxSample = Math.max(maxSample, Math.abs(samples[i]));
    }

    // Create pitch detector optimized for the sample array size
    const detector = PitchDetector.forFloat32Array(samples.length);

    // Perform pitch detection using autocorrelation algorithm
    // Returns [frequency_in_hz, clarity_confidence]
    const [pitch, clarity] = detector.findPitch(samples, SAMPLE_RATE);

    return { pitch, clarity };
  } catch (error) {
    console.log("Audio analysis error:", error);
    return null;
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }

    try {
      unlinkSync(rawFile);
    } catch {
      // Ignore cleanup errors
    }
  }
};
