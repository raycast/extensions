export const DEFAULT_MAX_SECONDS = 300;
export const MAX_ALLOWED_SECONDS = 3600;
export const METER_INTERVAL_MS = 500;
// -80 dBFS: a test for digital silence in a recorded file, never for speech (#648).
export const SILENCE_PEAK_THRESHOLD = 0.0001;

// Sits between a quiet room's rms p90 (0.0075) and speech p50 (0.0097) (#648).
export const SPEECH_RMS_THRESHOLD = 0.01;
export const IDLE_WARN_MS = 30_000;
export const IDLE_STOP_GRACE_MS = 15_000;
export const NO_SIGNAL_TIMEOUT_MS = 8_000;
export const PROBE_TIMEOUT_MS = 5_000;
export const TRANSCRIBE_TIMEOUT_MS = 60_000;
export const TRANSCRIBE_TIMEOUT_SECONDS = TRANSCRIBE_TIMEOUT_MS / 1000;

export function parseMaxSeconds(value: string | undefined): number {
  const raw = value?.trim() || String(DEFAULT_MAX_SECONDS);
  const parsed = Number(raw);
  if (
    !Number.isInteger(parsed) ||
    parsed <= 0 ||
    parsed > MAX_ALLOWED_SECONDS
  ) {
    throw new Error(
      `Max recording seconds must be an integer between 1 and ${MAX_ALLOWED_SECONDS}.`,
    );
  }
  return parsed;
}
