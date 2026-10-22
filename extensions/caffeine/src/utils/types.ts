export interface CaffeineState {
  active: boolean;
  pid?: number;
  processStartTime?: number;
  statusFilePath?: string;
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

export const TIMER_PRESETS: TimerPreset[] = [
  {
    id: "5m",
    title: "5 Minutes",
    subtitle: "Keep awake for 5 minutes",
    minutes: 5,
    durationSeconds: 5 * 60,
  },
  {
    id: "10m",
    title: "10 Minutes",
    subtitle: "Keep awake for 10 minutes",
    minutes: 10,
    durationSeconds: 10 * 60,
  },
  {
    id: "15m",
    title: "15 Minutes",
    subtitle: "Keep awake for 15 minutes",
    minutes: 15,
    durationSeconds: 15 * 60,
  },
  {
    id: "30m",
    title: "30 Minutes",
    subtitle: "Keep awake for 30 minutes",
    minutes: 30,
    durationSeconds: 30 * 60,
  },
  {
    id: "45m",
    title: "45 Minutes",
    subtitle: "Keep awake for 45 minutes",
    minutes: 45,
    durationSeconds: 45 * 60,
  },
  {
    id: "1h",
    title: "1 Hour",
    subtitle: "Keep awake for 1 hour",
    minutes: 60,
    durationSeconds: 60 * 60,
  },
  {
    id: "2h",
    title: "2 Hours",
    subtitle: "Keep awake for 2 hours",
    minutes: 120,
    durationSeconds: 120 * 60,
  },
];
