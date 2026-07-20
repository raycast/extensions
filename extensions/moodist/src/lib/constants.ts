export const STORAGE_KEYS = {
  PLAYBACK_STATE: "moodist-playback-state",
  PRESETS: "moodist-presets",
  TIMER: "moodist-timer",
} as const;

export const PID_REGISTRY_FILENAME = "pid-registry.json";

export const DEFAULT_VOLUME = 75;
export const VOLUME_PRESETS = [10, 25, 50, 75, 100] as const;

export const TIMER_DURATIONS = [
  { title: "15 minutes", value: 15 },
  { title: "30 minutes", value: 30 },
  { title: "45 minutes", value: 45 },
  { title: "1 hour", value: 60 },
  { title: "1.5 hours", value: 90 },
  { title: "2 hours", value: 120 },
] as const;
