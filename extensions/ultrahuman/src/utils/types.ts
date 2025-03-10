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
}

export interface SleepSummaryMetric {
  title: string;
  score: number;
  state_title?: string;
  state?: string;
}

export interface MetricObject {
  title: string;
  value?: number;
  values?: MetricValue[];
  total?: number;
  score_trend?: {
    day_avg: number;
  };
  last_reading?: number;
  day_start_timestamp?: number;
  quick_metrics?: QuickMetric[];
  sleep_stages?: SleepStage[];
  summary?: SleepSummaryMetric[];
  spo2?: {
    value: number;
    state: string;
  };
  toss_turn?: {
    count: number;
    state: string;
  };
}

export interface Metric {
  type: string;
  object: MetricObject;
}

export interface ApiResponse {
  data: {
    metric_data: Metric[];
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
  recovery: {
    value: number;
    title: string;
  };
  sleep: {
    value: number;
    title: string;
  };
  movement: {
    value: number;
    title: string;
  };
  steps: {
    value: number;
    title: string;
    total: number;
  };
  heartRate: HeartRateMetric;
}

export interface SleepStage {
  title: string;
  stage_time_text: string;
  percentage: number;
}

export interface SleepMetric {
  value: number;
  title: string;
  state_title?: string;
  state?: string;
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
