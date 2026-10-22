export interface CaffeineState {
  active: boolean;
  pid?: number;
  startedAt?: number;
  expiresAt?: number | null; // null = indefinite
  durationSeconds: number; // 0 = indefinite
  preventDisplaySleep: boolean;
}

export interface TimerPreset {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  durationSeconds: number;
}

export interface ExtensionPreferences {
  preventDisplaySleep?: boolean;
}

export const TIMER_PRESETS: TimerPreset[] = [
  {
    id: '15m',
    title: '15 Minutes',
    subtitle: 'Keep awake for 15 minutes',
    minutes: 15,
    durationSeconds: 15 * 60,
  },
  {
    id: '30m',
    title: '30 Minutes',
    subtitle: 'Keep awake for 30 minutes',
    minutes: 30,
    durationSeconds: 30 * 60,
  },
  {
    id: '1h',
    title: '1 Hour',
    subtitle: 'Keep awake for 1 hour',
    minutes: 60,
    durationSeconds: 60 * 60,
  },
];
