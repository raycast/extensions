export interface Preferences {
  email: string;
  apiKey: string;
}

export interface MetricValue {
  value: number;
  timestamp: number;
}

export interface QuickMetric {
  type: string;
  display_text: string;
  value: number;
}

export interface SleepStage {
  title: string;
  type: string;
  percentage: number;
  stage_time_text: string;
  stage_time: number;
}

export interface SummaryItem {
  title: string;
  score: number;
  state_title?: string;
  state?: string;
}

export interface MetricData {
  sleep_score?: number;
  recovery_score?: number;
  movement_score?: number;
  steps?: number;
  active_minutes?: number;
  resting_heart_rate?: number;
  hrv?: number;
  sleep_duration?: string;
  deep_sleep?: string;
  rem_sleep?: string;
  light_sleep?: string;
  sleep_efficiency?: string;
  [key: string]: unknown;
}

export interface ApiResponse {
  data: {
    metric_data: MetricData[];
  };
}

export interface BaseMetric {
  value: number;
  title: string;
}

export interface StepsMetric extends BaseMetric {
  total: number;
}

export interface HeartRateMetric extends BaseMetric {
  unit: string;
  lastUpdateTime?: number;
}

export interface SummaryMetrics {
  recovery: BaseMetric;
  sleep: BaseMetric;
  movement: BaseMetric;
  steps: StepsMetric;
  heartRate: HeartRateMetric;
}

export interface SleepMetric {
  value: number;
  title: string;
  state_title: string;
  state: string;
  unit: string;
}

export interface SleepMetrics {
  efficiency: SleepMetric;
  temperature: SleepMetric;
  restfulness: SleepMetric;
  consistency: SleepMetric;
  totalSleep: SleepMetric;
  hrDrop: SleepMetric;
  timing: SleepMetric;
  restoration: SleepMetric;
  spo2: SleepMetric;
  tossAndTurns: SleepMetric;
  timeInBed: string;
  actualSleepTime: string;
}
