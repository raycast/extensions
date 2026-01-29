// Oura API Response Types
export interface OuraDailySleep {
  id: string;
  day: string;
  score: number | null;
  timestamp: string;
  contributors: {
    deep_sleep: number | null;
    efficiency: number | null;
    latency: number | null;
    rem_sleep: number | null;
    restfulness: number | null;
    timing: number | null;
    total_sleep: number | null;
  };
}

export interface OuraDailyReadiness {
  id: string;
  day: string;
  score: number | null;
  timestamp: string;
  contributors: {
    activity_balance: number | null;
    body_temperature: number | null;
    hrv_balance: number | null;
    previous_day_activity: number | null;
    previous_night: number | null;
    recovery_index: number | null;
    resting_heart_rate: number | null;
    sleep_balance: number | null;
  };
}

export interface OuraHeartRate {
  bpm: number;
  source: string;
  timestamp: string;
}

export interface OuraSleepData {
  data: OuraDailySleep[];
}

export interface OuraReadinessData {
  data: OuraDailyReadiness[];
}

// P360 Types
export type ReadinessStatus = "excellent" | "good" | "caution" | "poor";

export interface BiometricData {
  sleepScore: number | null;
  readinessScore: number | null;
  hrvBalance: number | null;
  restingHR: number | null;
  date: string;
}

export interface DecisionReadiness {
  score: number;
  status: ReadinessStatus;
  message: string;
  recommendation: string;
  metrics: {
    sleep: { value: number | null; label: string };
    readiness: { value: number | null; label: string };
    hrv: { value: number | null; label: string };
  };
}
