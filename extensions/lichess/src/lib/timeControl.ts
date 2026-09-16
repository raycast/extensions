export interface ClockValues {
  time: number;
  increment: number;
}

export const MIN_CLOCK_VALUE = 0;
export const MAX_CLOCK_VALUE = 180;
export const MIN_REALTIME_SEEK_DURATION_SECONDS = 480;
export const ESTIMATED_MOVES_PER_GAME = 40;

export function parseClockValue(value: string): number | undefined {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < MIN_CLOCK_VALUE || parsed > MAX_CLOCK_VALUE) {
    return undefined;
  }

  return parsed;
}

export function isSupportedRealtimeSeekClock({ time, increment }: ClockValues): boolean {
  return estimatedDurationSeconds({ time, increment }) >= MIN_REALTIME_SEEK_DURATION_SECONDS;
}

export function estimatedDurationSeconds({ time, increment }: ClockValues): number {
  return time * 60 + increment * ESTIMATED_MOVES_PER_GAME;
}
