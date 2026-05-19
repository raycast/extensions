export const DEFAULT_MAX_SECONDS = 120;
export const MAX_ALLOWED_SECONDS = 3600;
export const SILENCE_PEAK_THRESHOLD = 0.0001;
export const METER_INTERVAL_MS = 500;
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
